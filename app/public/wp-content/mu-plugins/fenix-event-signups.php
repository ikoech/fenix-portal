<?php
/**
 * Authenticated REST endpoints for member event signups.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'fenix/v1',
			'/event-signups',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => 'fenix_get_event_signup_summary',
					'permission_callback' => static function () {
						return is_user_logged_in() && current_user_can( 'read' );
					},
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => 'fenix_create_event_signup',
					'permission_callback' => static function () {
						return is_user_logged_in() && current_user_can( 'read' );
					},
					'args'                => array(
						'event_id' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
							'validate_callback' => static function ( $value ) {
								return absint( $value ) > 0;
							},
						),
					),
				),
			)
		);

		register_rest_route(
			'fenix/v1',
			'/event-signups/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => 'fenix_delete_event_signup',
				'permission_callback' => static function () {
					return is_user_logged_in() && current_user_can( 'read' );
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
	}
);

add_filter( 'rest_pre_dispatch', 'fenix_restrict_event_signup_rest_api', 10, 3 );

function fenix_restrict_event_signup_rest_api( $result, $server, WP_REST_Request $request ) {
	if ( ! preg_match( '#^/wp/v2/event-signups(?:/|$)#', $request->get_route() ) ) {
		return $result;
	}

	if ( ! is_user_logged_in() ) {
		return new WP_Error(
			'fenix_private_event_signups',
			'Authentication is required to access event signups.',
			array( 'status' => 401 )
		);
	}

	if ( ! current_user_can( 'manage_options' ) ) {
		return new WP_Error(
			'fenix_forbidden_event_signups',
			'You are not allowed to access event signup records.',
			array( 'status' => 403 )
		);
	}

	return $result;
}

add_filter( 'rest_pre_dispatch', 'fenix_restrict_private_post_rest_api', 10, 3 );
add_filter( 'rest_pre_dispatch', 'fenix_restrict_event_rest_writes', 10, 3 );
add_filter( 'register_post_type_args', 'fenix_restrict_private_post_type_queries', 10, 2 );

function fenix_restrict_private_post_rest_api( $result, $server, WP_REST_Request $request ) {
	$private_routes = array(
		'/wp/v2/documents',
		'/wp/v2/seeking',
		'/wp/v2/tfa',
	);
	$route          = $request->get_route();
	$is_private     = false;

	foreach ( $private_routes as $private_route ) {
		if ( preg_match( '#^' . preg_quote( $private_route, '#' ) . '(?:/|$)#', $route ) ) {
			$is_private = true;
			break;
		}
	}

	if ( ! $is_private || is_user_logged_in() ) {
		return $result;
	}

	return new WP_Error(
		'fenix_private_portal_data',
		'Authentication is required to access this resource.',
		array( 'status' => 401 )
	);
}

function fenix_restrict_event_rest_writes( $result, $server, WP_REST_Request $request ) {
	if (
		! preg_match( '#^/wp/v2/event(?:/|$)#', $request->get_route() ) ||
		in_array( $request->get_method(), array( 'GET', 'HEAD', 'OPTIONS' ), true )
	) {
		return $result;
	}

	if ( ! is_user_logged_in() ) {
		return new WP_Error(
			'fenix_event_write_auth_required',
			'Authentication is required to modify events.',
			array( 'status' => 401 )
		);
	}

	if ( ! current_user_can( 'manage_options' ) ) {
		return new WP_Error(
			'fenix_forbidden_event_write',
			'You are not allowed to modify events.',
			array( 'status' => 403 )
		);
	}

	return $result;
}

function fenix_restrict_private_post_type_queries( $args, $post_type ) {
	if ( in_array( $post_type, array( 'document', 'event_signup', 'seeking', 'tfa' ), true ) ) {
		$args['publicly_queryable'] = false;
		$args['exclude_from_search'] = true;
		$args['has_archive']         = false;
	}

	return $args;
}

function fenix_get_event_signup_summary() {
	$signup_ids = get_posts(
		array(
			'post_type'      => 'event_signup',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
		)
	);
	$counts     = array();
	$mine       = array();
	$user_id    = get_current_user_id();

	foreach ( $signup_ids as $signup_id ) {
		$event_id = absint( get_post_meta( $signup_id, 'event_id', true ) );
		if ( ! $event_id ) {
			continue;
		}

		$counts[ $event_id ] = isset( $counts[ $event_id ] ) ? $counts[ $event_id ] + 1 : 1;
		if ( absint( get_post_meta( $signup_id, 'member_id', true ) ) === $user_id ) {
			$mine[ $event_id ] = (int) $signup_id;
		}
	}

	return rest_ensure_response(
		array(
			'counts'    => $counts,
			'signupIds' => $mine,
		)
	);
}

function fenix_create_event_signup( WP_REST_Request $request ) {
	$event_id = absint( $request->get_param( 'event_id' ) );
	$event    = get_post( $event_id );

	if ( ! $event || 'event' !== $event->post_type || 'publish' !== $event->post_status ) {
		return new WP_Error(
			'fenix_invalid_event',
			'The selected event does not exist or is not available.',
			array( 'status' => 404 )
		);
	}

	$user_id = get_current_user_id();
	$existing_signups = get_posts(
		array(
			'post_type'      => 'event_signup',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array(
				'relation' => 'AND',
				array(
					'key'   => 'member_id',
					'value' => $user_id,
				),
				array(
					'key'   => 'event_id',
					'value' => $event_id,
				),
			),
		)
	);

	if ( $existing_signups ) {
		return new WP_Error(
			'fenix_duplicate_signup',
			'You are already signed up for this event.',
			array( 'status' => 409 )
		);
	}

	if ( ! function_exists( 'update_field' ) ) {
		return new WP_Error(
			'fenix_acf_unavailable',
			'Event signup fields are unavailable.',
			array( 'status' => 500 )
		);
	}

	$signup_id = wp_insert_post(
		array(
			'post_type'   => 'event_signup',
			'post_status' => 'draft',
			'post_title'  => sprintf( 'Signup for event %d', $event_id ),
			'post_author' => $user_id,
		),
		true
	);

	if ( is_wp_error( $signup_id ) ) {
		return $signup_id;
	}

	update_field( 'member_id', $user_id, $signup_id );
	update_field( 'event_id', $event_id, $signup_id );
	update_field( 'signup_date', current_time( 'mysql' ), $signup_id );

	$published_id = wp_update_post(
		array(
			'ID'          => $signup_id,
			'post_status' => 'publish',
		),
		true
	);

	if ( is_wp_error( $published_id ) ) {
		wp_delete_post( $signup_id, true );
		return $published_id;
	}

	return new WP_REST_Response( array( 'id' => $signup_id ), 201 );
}

function fenix_delete_event_signup( WP_REST_Request $request ) {
	$signup = get_post( absint( $request->get_param( 'id' ) ) );

	if ( ! $signup || 'event_signup' !== $signup->post_type ) {
		return new WP_Error(
			'fenix_signup_not_found',
			'The signup does not exist.',
			array( 'status' => 404 )
		);
	}

	$is_owner = (int) get_post_meta( $signup->ID, 'member_id', true ) === get_current_user_id();
	if ( ! $is_owner && ! current_user_can( 'manage_options' ) ) {
		return new WP_Error(
			'fenix_forbidden_signup',
			'You can only cancel your own signup.',
			array( 'status' => 403 )
		);
	}

	if ( ! wp_delete_post( $signup->ID, true ) ) {
		return new WP_Error(
			'fenix_signup_delete_failed',
			'The signup could not be cancelled.',
			array( 'status' => 500 )
		);
	}

	return new WP_REST_Response( array( 'deleted' => true ) );
}
