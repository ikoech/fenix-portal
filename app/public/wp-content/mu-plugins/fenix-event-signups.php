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
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'fenix_create_event_signup',
				'permission_callback' => static function () {
					return current_user_can( 'read' );
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
			)
		);

		register_rest_route(
			'fenix/v1',
			'/event-signups/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => 'fenix_delete_event_signup',
				'permission_callback' => static function () {
					return current_user_can( 'read' );
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
