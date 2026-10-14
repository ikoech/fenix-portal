<?php
/**
 * Authenticated member profile updates and public directory profile fields.
 */

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
			'/members',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'fenix_get_member_directory',
				'permission_callback' => static function () {
					return is_user_logged_in();
				},
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
			return fenix_get_member_profile_data( $user->ID );
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
		$acf  = isset( $data['acf'] ) && is_array( $data['acf'] ) ? $data['acf'] : array();

		foreach ( array( 'company', 'phone', 'bio', 'interests', 'industry', 'role', 'website', 'linkedin', 'avatar_url' ) as $field ) {
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

	foreach ( array( 'company', 'phone', 'bio', 'interests', 'industry', 'role', 'avatar_url', 'photo', 'linkedin', 'website' ) as $field ) {
		if ( array_key_exists( $field, $acf ) && ! is_scalar( $acf[ $field ] ) ) {
			return new WP_Error(
				'fenix_invalid_profile_value',
				sprintf( '%s must be text.', ucfirst( str_replace( '_', ' ', $field ) ) ),
				array( 'status' => 400 )
			);
		}
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

	$text_fields = array( 'company', 'phone', 'interests', 'industry', 'role' );
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
