<?php
/**
 * Authenticated member profile updates and public directory profile fields.
 */

use Tmeister\Firebase\JWT\JWT;
use Tmeister\Firebase\JWT\Key;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'fenix/v1',
			'/users/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'fenix_update_member_profile',
				'permission_callback' => static function ( WP_REST_Request $request ) {
					$user_id = absint( $request['id'] );
					return is_user_logged_in() && (
						get_current_user_id() === $user_id ||
						current_user_can( 'edit_user', $user_id )
					);
				},
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			'fenix/v1',
			'/users/me/password',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'fenix_change_member_password',
				'permission_callback' => static function () {
					return is_user_logged_in();
				},
			)
		);

		register_rest_route(
			'fenix/v1',
			'/members',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'fenix_get_member_directory',
				'permission_callback' => '__return_true',
				'args'                => array(
					'per_page' => array(
						'default'           => 100,
						'sanitize_callback' => 'absint',
						'validate_callback' => static function ( $value ) {
							return absint( $value ) > 0 && absint( $value ) <= 100;
						},
					),
					'page'     => array(
						'default'           => 1,
						'sanitize_callback' => 'absint',
						'validate_callback' => static function ( $value ) {
							return absint( $value ) > 0;
						},
					),
				),
			)
		);
	}
);

add_filter( 'jwt_auth_token_before_sign', 'fenix_add_password_token_version', 10, 2 );
add_filter( 'determine_current_user', 'fenix_reject_outdated_password_tokens', 20 );
add_filter( 'rest_pre_dispatch', 'fenix_restrict_public_user_rest_api', 10, 3 );

function fenix_add_password_token_version( $token, $user ) {
	if ( $user instanceof WP_User ) {
		$version = get_user_meta( $user->ID, 'fenix_password_token_version', true );
		if ( is_string( $version ) && '' !== $version ) {
			$token['fenix_password_version'] = $version;
		}
	}

	return $token;
}

function fenix_reject_outdated_password_tokens( $user_id ) {
	if ( ! $user_id || ! get_user_meta( $user_id, 'fenix_password_token_version', true ) ) {
		return $user_id;
	}

	$authorization = isset( $_SERVER['HTTP_AUTHORIZATION'] )
		? $_SERVER['HTTP_AUTHORIZATION']
		: ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '' );
	if ( ! preg_match( '/^Bearer\s+(\S+)$/i', trim( $authorization ), $matches ) ) {
		return $user_id;
	}

	if ( ! defined( 'JWT_AUTH_SECRET_KEY' ) || ! class_exists( JWT::class ) || ! class_exists( Key::class ) ) {
		return 0;
	}

	try {
		$algorithm = apply_filters( 'jwt_auth_algorithm', 'HS256' );
		$token     = JWT::decode( $matches[1], new Key( JWT_AUTH_SECRET_KEY, $algorithm ) );
	} catch ( Throwable $error ) {
		return 0;
	}

	$user    = get_userdata( $user_id );
	$version = get_user_meta( $user_id, 'fenix_password_token_version', true );
	if (
		! $user ||
		! isset( $token->data->user->id, $token->fenix_password_version ) ||
		absint( $token->data->user->id ) !== absint( $user_id ) ||
		! is_string( $token->fenix_password_version ) ||
		! hash_equals( (string) $version, $token->fenix_password_version )
	) {
		return 0;
	}

	return $user_id;
}

function fenix_restrict_public_user_rest_api( $result, $server, WP_REST_Request $request ) {
	$route = $request->get_route();
	if ( ! preg_match( '#^/wp/v2/users(?:/|$)#', $route ) || '/wp/v2/users/me' === $route ) {
		return $result;
	}

	if ( ! is_user_logged_in() ) {
		return new WP_Error(
			'fenix_private_user_directory',
			'Authentication is required to access user records.',
			array( 'status' => 401 )
		);
	}

	if ( ! current_user_can( 'manage_options' ) ) {
		return new WP_Error(
			'fenix_forbidden_user_directory',
			'You are not allowed to access user records.',
			array( 'status' => 403 )
		);
	}

	return $result;
}

function fenix_get_member_directory( WP_REST_Request $request ) {
	$per_page    = absint( $request->get_param( 'per_page' ) );
	$page        = absint( $request->get_param( 'page' ) );
	$total_users = count_users();
	$total       = (int) $total_users['total_users'];
	$users       = get_users(
		array(
			'number'  => $per_page,
			'offset'  => ( $page - 1 ) * $per_page,
			'orderby' => 'display_name',
			'order'   => 'ASC',
			'fields'  => 'all',
		)
	);
	$members     = array_map(
		static function ( $user ) {
			return fenix_get_public_member_profile_data( $user->ID );
		},
		$users
	);
	$response    = new WP_REST_Response( $members );
	$response->header( 'X-WP-Total', (string) $total );
	$response->header( 'X-WP-TotalPages', (string) max( 1, (int) ceil( $total / $per_page ) ) );

	return $response;
}

add_filter(
	'rest_prepare_user',
	static function ( $response, $user ) {
		if ( is_wp_error( $response ) || ! $user instanceof WP_User ) {
			return $response;
		}

		$data = $response->get_data();
		if ( ! is_user_logged_in() ) {
			unset( $data['email'], $data['acf'] );
			$response->set_data( $data );
			return $response;
		}

		$acf  = isset( $data['acf'] ) && is_array( $data['acf'] ) ? $data['acf'] : array();

		foreach ( array( 'company', 'phone', 'bio', 'interests', 'industry', 'role', 'expertise', 'specific_search', 'deputy', 'website', 'linkedin', 'avatar_url' ) as $field ) {
			$acf[ $field ] = (string) get_user_meta( $user->ID, $field, true );
		}
		$acf['photo'] = $acf['avatar_url'];

		$public_data = array_merge( $data, array( 'acf' => $acf ) );
		if ( is_user_logged_in() ) {
			$public_data['email'] = $user->user_email;
		}

		$response->set_data( $public_data );
		return $response;
	},
	20,
	2
);

function fenix_update_member_profile( WP_REST_Request $request ) {
	$user_id = absint( $request['id'] );
	$user    = get_userdata( $user_id );

	if ( ! $user ) {
		return new WP_Error(
			'fenix_member_not_found',
			'The member does not exist.',
			array( 'status' => 404 )
		);
	}

	$params = $request->get_json_params();
	if ( ! is_array( $params ) ) {
		return new WP_Error(
			'fenix_invalid_profile',
			'Profile data must be a JSON object.',
			array( 'status' => 400 )
		);
	}

	if ( array_key_exists( 'acf', $params ) && ! is_array( $params['acf'] ) ) {
		return new WP_Error(
			'fenix_invalid_profile_fields',
			'Profile fields must be a JSON object.',
			array( 'status' => 400 )
		);
	}

	$acf = isset( $params['acf'] ) ? $params['acf'] : array();
	foreach ( array( 'name', 'email' ) as $field ) {
		if ( array_key_exists( $field, $params ) && ! is_string( $params[ $field ] ) ) {
			return new WP_Error(
				'fenix_invalid_profile_value',
				sprintf( '%s must be text.', ucfirst( $field ) ),
				array( 'status' => 400 )
			);
		}
	}

	foreach ( array( 'company', 'phone', 'bio', 'interests', 'industry', 'role', 	'expertise', 'specific_search', 'deputy', 'avatar_url', 'photo', 'linkedin', 'website' ) as $field ) {
		if ( array_key_exists( $field, $acf ) && ! is_scalar( $acf[ $field ] ) ) {
			return new WP_Error(
				'fenix_invalid_profile_value',
				sprintf( '%s must be text.', ucfirst( str_replace( '_', ' ', $field ) ) ),
				array( 'status' => 400 )
			);
		}
	}

		$deputy_length = array_key_exists( 'deputy', $acf ) ? preg_match_all( '/[\s\S]/u', (string) $acf['deputy'] ) : 0;
	if ( false === $deputy_length || $deputy_length > 200 ) {
			return new WP_Error(
				'fenix_invalid_profile_value',
				'Deputy must be at most 200 characters.',
				array( 'status' => 400 )
			);
		}

	$profile_textareas = array();
	foreach ( array( 'expertise', 'specific_search' ) as $field ) {
		if ( ! array_key_exists( $field, $acf ) ) {
			continue;
		}
		$value = str_replace( array( "\r\n", "\r" ), "\n", (string) $acf[ $field ] );
		// HTML maxlength counts UTF-16 code units, including two for non-BMP characters.
		$characters = preg_match_all( '/[\s\S]/u', $value );
		$surrogates = preg_match_all( '/[\x{10000}-\x{10FFFF}]/u', $value );
		if ( false === $characters || false === $surrogates || $characters + $surrogates > 1000 ) {
			return new WP_Error(
				'fenix_invalid_profile_value',
				sprintf( '%s must contain valid text of at most 1000 characters.', ucfirst( str_replace( '_', ' ', $field ) ) ),
				array( 'status' => 400 )
			);
		}
		$profile_textareas[ $field ] = sanitize_textarea_field( $value );
	}

	$update = array( 'ID' => $user_id );

	if ( array_key_exists( 'name', $params ) ) {
		$name = sanitize_text_field( $params['name'] );
		if ( '' === $name ) {
			return new WP_Error(
				'fenix_invalid_name',
				'Name cannot be empty.',
				array( 'status' => 400 )
			);
		}
		$update['display_name'] = $name;
	}

	if ( array_key_exists( 'email', $params ) ) {
		$email = sanitize_email( $params['email'] );
		if ( ! is_email( $email ) ) {
			return new WP_Error(
				'fenix_invalid_email',
				'Enter a valid email address.',
				array( 'status' => 400 )
			);
		}
		$update['user_email'] = $email;
	}

	if ( count( $update ) > 1 ) {
		$result = wp_update_user( $update );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
	}

	$text_fields = array( 'company', 'phone', 'interests', 	'industry', 'role', 'deputy' );
	foreach ( $text_fields as $field ) {
		if ( array_key_exists( $field, $acf ) ) {
			update_user_meta( $user_id, $field, sanitize_text_field( (string) $acf[ $field ] ) );
		}
	}

	foreach ( array( 'bio' ) as $field ) {
		if ( array_key_exists( $field, $acf ) ) {
			update_user_meta( $user_id, $field, sanitize_textarea_field( (string) $acf[ $field ] ) );
		}
	}

	foreach ( $profile_textareas as $field => $value ) {
		update_user_meta( $user_id, $field, wp_slash( $value ) );
		if ( get_user_meta( $user_id, $field, true ) !== $value ) {
			return new WP_Error(
				'fenix_profile_save_failed',
				sprintf( 'Could not save %s.', str_replace( '_', ' ', $field ) ),
				array( 'status' => 500 )
			);
		}
	}

	$url_fields = array(
		'avatar_url' => 'photo',
		'linkedin'   => 'linkedin',
		'website'    => 'website',
	);
	foreach ( $url_fields as $field => $alias ) {
		if ( array_key_exists( $field, $acf ) || array_key_exists( $alias, $acf ) ) {
			$value = array_key_exists( $field, $acf ) ? $acf[ $field ] : $acf[ $alias ];
			update_user_meta( $user_id, $field, esc_url_raw( (string) $value ) );
		}
	}

	return rest_ensure_response( fenix_get_member_profile_data( $user_id ) );
}

function fenix_change_member_password( WP_REST_Request $request ) {
	$params = $request->get_json_params();
	if (
		! is_array( $params ) ||
		! isset( $params['current_password'], $params['new_password'] ) ||
		! is_string( $params['current_password'] ) ||
		! is_string( $params['new_password'] ) ||
		'' === $params['current_password'] ||
		'' === $params['new_password']
	) {
		return new WP_Error(
			'fenix_invalid_password_request',
			'Enter your current password and a new password.',
			array( 'status' => 400 )
		);
	}

	$user_id = get_current_user_id();
	$user    = get_userdata( $user_id );
	if ( ! $user || ! wp_check_password( $params['current_password'], $user->user_pass, $user_id ) ) {
		return new WP_Error(
			'fenix_incorrect_current_password',
			'Your current password is incorrect.',
			array( 'status' => 403 )
		);
	}

	$password_length = preg_match_all( '/[\s\S]/u', $params['new_password'] );
	if ( false === $password_length || $password_length < 8 ) {
		return new WP_Error(
			'fenix_weak_password',
			'Your new password must be at least 8 characters.',
			array( 'status' => 400 )
		);
	}

	if ( wp_check_password( $params['new_password'], $user->user_pass, $user_id ) ) {
		return new WP_Error(
			'fenix_password_unchanged',
			'Your new password must be different from your current password.',
			array( 'status' => 400 )
		);
	}

	$version = wp_generate_password( 64, false, false );
	update_user_meta( $user_id, 'fenix_password_token_version', $version );
	if ( get_user_meta( $user_id, 'fenix_password_token_version', true ) !== $version ) {
		return new WP_Error(
			'fenix_password_session_update_failed',
			'Could not update your session security. Please try again.',
			array( 'status' => 500 )
		);
	}

	wp_set_password( $params['new_password'], $user_id );
	$updated_user = get_userdata( $user_id );
	if ( ! $updated_user || ! wp_check_password( $params['new_password'], $updated_user->user_pass, $user_id ) ) {
		return new WP_Error(
			'fenix_password_update_failed',
			'Could not update your password. Please try again.',
			array( 'status' => 500 )
		);
	}

	return rest_ensure_response( array( 'success' => true ) );
}

function fenix_get_member_profile_data( $user_id ) {
	$user = get_userdata( $user_id );
	$acf  = array();

	foreach (
		array(
			'company',
			'phone',
			'bio',
			'interests',
			'industry',
			'role',
			'expertise',
			'specific_search',
			'deputy',
			'website',
			'linkedin',
			'avatar_url',
		) as $field
	) {
		$acf[ $field ] = get_user_meta( $user_id, $field, true );
	}

	$acf['photo'] = $acf['avatar_url'];

	return array(
		'id'           => (int) $user->ID,
		'name'         => $user->display_name,
		'email'        => $user->user_email,
		'roles'        => array_values( $user->roles ),
		'acf'          => $acf,
	);
}

function fenix_get_public_member_profile_data( $user_id ) {
	$profile = fenix_get_member_profile_data( $user_id );
	$acf     = $profile['acf'];

	return array(
		'id'   => $profile['id'],
		'name' => $profile['name'],
		'acf'  => array(
			'company'  => fenix_public_profile_text( $acf['company'] ),
			'bio'      => fenix_public_profile_text( $acf['bio'] ),
			'industry' => fenix_public_profile_text( $acf['industry'] ),
			'role'     => fenix_public_profile_text( $acf['role'] ),
			'website'  => fenix_public_profile_url( $acf['website'] ),
			'linkedin' => fenix_public_profile_url( $acf['linkedin'] ),
			'photo'    => fenix_public_profile_url( $acf['avatar_url'] ),
		),
	);
}

function fenix_public_profile_text( $value ) {
	return is_scalar( $value ) ? (string) $value : '';
}

function fenix_public_profile_url( $value ) {
	return is_scalar( $value ) ? esc_url_raw( (string) $value ) : '';
}
