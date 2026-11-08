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
							'validate_callback' => static function ( $value ) {
								return is_numeric( $value ) && (int) $value > 0 && (string) (int) $value === (string) $value;
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

		register_rest_route(
			'fenix/v1',
			'/event-signups/(?P<id>\d+)/guests',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'fenix_add_event_guest',
				'permission_callback' => static function () {
					return is_user_logged_in() && current_user_can( 'read' );
				},
				'args'                => array(
					'name' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);
		register_rest_route(
			'fenix/v1',
			'/event-signups/(?P<id>\d+)/guests/(?P<guest_id>[a-f0-9-]+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => 'fenix_remove_event_guest',
				'permission_callback' => static function () {
					return is_user_logged_in() && current_user_can( 'read' );
				},
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
			'orderby'        => array( 'date' => 'DESC', 'ID' => 'DESC' ),
		)
	);
	$counts     = array();
	$breakdown  = array();
	$mine       = array();
	$attendees  = array();
	$cancelled  = array();
	$seen       = array();
	$members    = array();
	$user_id    = get_current_user_id();

	foreach ( $signup_ids as $signup_id ) {
		$event_id  = absint( get_post_meta( $signup_id, 'event_id', true ) );
		$member_id = absint( get_post_meta( $signup_id, 'member_id', true ) );
		$cancelled_at = get_post_meta( $signup_id, 'cancelled_at', true );
		if ( ! $event_id || ! $member_id ) {
			continue;
		}

		if ( ! array_key_exists( $member_id, $members ) ) {
			$members[ $member_id ] = null;
			if ( get_userdata( $member_id ) ) {
				$profile               = fenix_get_public_member_profile_data( $member_id );
				$members[ $member_id ] = array(
					'id'         => $profile['id'],
					'name'       => $profile['name'],
					'avatar_url' => $profile['acf']['photo'],
				);
			}
		}

		if ( ! $members[ $member_id ] ) {
			continue;
		}

		if ( ! $cancelled_at ) {
			if ( isset( $seen[ $event_id ][ $member_id ] ) ) {
				continue;
			}
			$seen[ $event_id ][ $member_id ] = true;
			if ( $member_id === $user_id ) {
				$mine[ $event_id ] = (int) $signup_id;
			}
			if ( ! isset( $breakdown[ $event_id ] ) ) {
				$breakdown[ $event_id ] = array( 'members' => 0, 'guests' => 0 );
			}
			++$breakdown[ $event_id ]['members'];
		}

		$cancelled_by = absint( get_post_meta( $signup_id, 'cancelled_by', true ) );
		$cancel_user  = $cancelled_by ? get_userdata( $cancelled_by ) : false;
		$details      = array(
			'signup_id'    => (int) $signup_id,
			'signup_date'  => get_post_meta( $signup_id, 'signup_date', true ),
			'cancelled_at' => $cancelled_at,
			'cancelled_by' => $cancel_user ? $cancel_user->display_name : '',
		);
		$rows = array( array_merge( $members[ $member_id ], $details, array( 'type' => 'member' ) ) );
		foreach ( fenix_signup_guests( $signup_id ) as $guest ) {
			$rows[] = array_merge(
				$details,
				array(
					'id'           => $guest['id'],
					'name'         => $guest['name'],
					'type'         => 'guest',
					'inviter_id'   => $member_id,
					'inviter_name' => $members[ $member_id ]['name'],
				)
			);
			if ( ! $cancelled_at ) {
				++$breakdown[ $event_id ]['guests'];
			}
		}
		if ( $cancelled_at ) {
			$cancelled[ $event_id ] = array_merge( isset( $cancelled[ $event_id ] ) ? $cancelled[ $event_id ] : array(), $rows );
		} else {
			$attendees[ $event_id ] = array_merge( isset( $attendees[ $event_id ] ) ? $attendees[ $event_id ] : array(), $rows );
			$counts[ $event_id ] = $breakdown[ $event_id ]['members'] + $breakdown[ $event_id ]['guests'];
		}
	}

	return rest_ensure_response(
		array(
			'counts'    => (object) $counts,
			'breakdown' => (object) $breakdown,
			'signupIds' => (object) $mine,
			'attendees' => (object) $attendees,
			'cancelled' => (object) $cancelled,
		)
	);
}

function fenix_signup_guests( $signup_id ) {
	$guests = get_post_meta( $signup_id, 'fenix_guests', true );
	if ( ! is_array( $guests ) ) {
		return array();
	}
	return array_values(
		array_filter(
			$guests,
			// Fix 1: the nonblank name "0" is a valid, countable guest.
			static function ( $guest ) {
				return is_array( $guest ) && isset( $guest['id'], $guest['name'] )
					&& '' !== trim( (string) $guest['id'] )
					&& '' !== trim( (string) $guest['name'] );
			}
		)
	);
}

function fenix_with_event_lock( $event_id, $callback ) {
	global $wpdb;
	$lock = 'fenix_event_' . md5( $wpdb->prefix . ':' . $event_id );
	$acquired = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', $lock, 10 ) );
	if ( '1' !== (string) $acquired ) {
		return new WP_Error( 'fenix_event_busy', 'Could not lock the event. Please try again.', array( 'status' => 503 ) );
	}
	try {
		wp_cache_delete( $event_id, 'post_meta' );
		return $callback();
	} finally {
		$wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) );
	}
}

// Fix 4: keep rebuilds and mutations under the same per-event lock.
function fenix_event_signup_ids( $event_id ) {
	return get_posts(
		array(
			'post_type'      => 'event_signup',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => 'event_id',
			'meta_value'     => $event_id,
			'orderby'        => array( 'date' => 'DESC', 'ID' => 'DESC' ),
			'cache_results'  => false,
		)
	);
}

function fenix_write_verified_meta( $id, $key, $value ) {
	update_post_meta( $id, $key, $value );
	wp_cache_delete( $id, 'post_meta' );
	return get_post_meta( $id, $key, true ) == $value;
}

function fenix_rebuild_active_count_locked( $event_id ) {
	$dirty = fenix_mark_count_dirty( $event_id );
	if ( is_wp_error( $dirty ) ) {
		return $dirty;
	}
	$count = 0;
	$seen  = array();
	foreach ( fenix_event_signup_ids( $event_id ) as $signup_id ) {
		wp_cache_delete( $signup_id, 'post_meta' );
		$member_id = absint( get_post_meta( $signup_id, 'member_id', true ) );
		if ( ! $member_id || ! get_userdata( $member_id ) || isset( $seen[ $member_id ] )
			|| get_post_meta( $signup_id, 'cancelled_at', true ) ) {
			continue;
		}
		$seen[ $member_id ] = true;
		$count += 1 + count( fenix_signup_guests( $signup_id ) );
	}
	if ( ! fenix_write_verified_meta( $event_id, '_fenix_active_count', $count )
		|| ! fenix_write_verified_meta( $event_id, '_fenix_count_dirty', '0' ) ) {
		return new WP_Error( 'fenix_count_save_failed', 'The event count could not be rebuilt.', array( 'status' => 500 ) );
	}
	return $count;
}

function fenix_rebuild_active_counts( int $event_id ) {
	if ( $event_id <= 0 ) {
		return new WP_Error( 'fenix_invalid_event', 'Invalid event ID.', array( 'status' => 400 ) );
	}
	return fenix_with_event_lock( $event_id, static function () use ( $event_id ) {
		$event = get_post( $event_id );
		if ( ! $event || 'event' !== $event->post_type ) {
			return new WP_Error( 'fenix_invalid_event', 'The event does not exist.', array( 'status' => 404 ) );
		}
		return fenix_rebuild_active_count_locked( $event_id );
	} );
}

function fenix_prepare_event_count( $event_id ) {
	$count = get_post_meta( $event_id, '_fenix_active_count', true );
	$dirty = get_post_meta( $event_id, '_fenix_count_dirty', true );
	if ( '' === $count || ! ctype_digit( (string) $count ) || '1' === (string) $dirty ) {
		return fenix_rebuild_active_count_locked( $event_id );
	}
	return (int) $count;
}

function fenix_mark_count_dirty( $event_id ) {
	if ( ! fenix_write_verified_meta( $event_id, '_fenix_count_dirty', '1' ) ) {
		return new WP_Error( 'fenix_count_save_failed', 'The event count could not be marked for recovery.', array( 'status' => 500 ) );
	}
	return true;
}

function fenix_finish_count_change( $event_id, $count ) {
	if ( $count < 0 || ! fenix_write_verified_meta( $event_id, '_fenix_active_count', $count )
		|| ! fenix_write_verified_meta( $event_id, '_fenix_count_dirty', '0' ) ) {
		return new WP_Error( 'fenix_count_save_failed', 'The signup changed, but the event count could not be updated; it will be rebuilt on the next change.', array( 'status' => 500 ) );
	}
	return true;
}

function fenix_rebuild_all_counts() {
	$ids = get_posts( array( 'post_type' => 'event_signup', 'post_status' => 'publish', 'posts_per_page' => -1, 'fields' => 'ids' ) );
	$events = array();
	foreach ( $ids as $id ) {
		wp_cache_delete( $id, 'post_meta' );
		$event_id = absint( get_post_meta( $id, 'event_id', true ) );
		if ( $event_id ) {
			$events[ $event_id ] = true;
		}
	}
	foreach ( array_keys( $events ) as $event_id ) {
		$result = fenix_rebuild_active_counts( (int) $event_id );
		if ( is_wp_error( $result ) ) {
			error_log( sprintf( 'Fenix count rebuild failed for event %d: %s', $event_id, $result->get_error_message() ) );
		}
	}
}

// Must-use plugins are not activated/deactivated; schedule while this file is loaded.
add_action( 'init', static function () {
	if ( ! wp_next_scheduled( 'fenix_rebuild_all_counts' ) ) {
		$result = wp_schedule_event( time(), 'weekly', 'fenix_rebuild_all_counts', array(), true );
		if ( is_wp_error( $result ) ) {
			error_log( 'Fenix count rebuild scheduling failed: ' . $result->get_error_message() );
		} elseif ( false === $result ) {
			error_log( 'Fenix count rebuild scheduling failed.' );
		}
	}
} );
add_action( 'fenix_rebuild_all_counts', 'fenix_rebuild_all_counts' );

function fenix_unschedule_count_rebuild() {
	$result = wp_clear_scheduled_hook( 'fenix_rebuild_all_counts', array(), true );
	if ( is_wp_error( $result ) ) {
		error_log( 'Fenix count rebuild unscheduling failed: ' . $result->get_error_message() );
	}
	return $result;
}

register_deactivation_hook( __FILE__, 'fenix_unschedule_count_rebuild' );

function fenix_event_capacity_error( $event_id ) {
	$max = (int) get_post_meta( $event_id, 'max_attendees', true );
	if ( $max <= 0 ) {
		return null;
	}
	$count = fenix_prepare_event_count( $event_id );
	if ( is_wp_error( $count ) ) {
		return $count;
	}
	if ( $count >= $max ) {
		return new WP_Error( 'fenix_event_full', 'Eventet är fullbokat.', array( 'status' => 409 ) );
	}
	return null;
}

function fenix_create_event_signup( WP_REST_Request $request ) {
	$raw_id = $request->get_param( 'event_id' );
	if ( ! is_numeric( $raw_id ) || (int) $raw_id <= 0 || (string) (int) $raw_id !== (string) $raw_id ) {
		return new WP_Error( 'fenix_invalid_event', 'Invalid event ID.', array( 'status' => 400 ) );
	}
	$event_id = (int) $raw_id;
	return fenix_with_event_lock( $event_id, static function () use ( $event_id ) {
		clean_post_cache( $event_id );
		$event = get_post( $event_id );
		if ( ! $event || 'event' !== $event->post_type || 'publish' !== $event->post_status ) {
			return new WP_Error( 'fenix_invalid_event', 'The selected event does not exist or is not available.', array( 'status' => 404 ) );
		}
		$user_id = get_current_user_id();
		foreach ( fenix_event_signup_ids( $event_id ) as $id ) {
			wp_cache_delete( $id, 'post_meta' );
			if ( (int) get_post_meta( $id, 'member_id', true ) === $user_id && ! get_post_meta( $id, 'cancelled_at', true ) ) {
				return new WP_Error( 'fenix_duplicate_signup', 'You are already signed up for this event.', array( 'status' => 409 ) );
			}
		}
		$count = fenix_prepare_event_count( $event_id );
		if ( is_wp_error( $count ) ) {
			return $count;
		}
		$capacity_error = fenix_event_capacity_error( $event_id );
		if ( $capacity_error ) {
			return $capacity_error;
		}
		if ( ! function_exists( 'update_field' ) ) {
			return new WP_Error( 'fenix_acf_unavailable', 'Event signup fields are unavailable.', array( 'status' => 500 ) );
		}
		$dirty = fenix_mark_count_dirty( $event_id );
		if ( is_wp_error( $dirty ) ) {
			return $dirty;
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
		// Fix 2: read back every required field before publishing.
		$fields = array( 'member_id' => $user_id, 'event_id' => $event_id, 'signup_date' => current_time( 'mysql' ) );
		foreach ( $fields as $key => $value ) {
			update_field( $key, $value, $signup_id );
			wp_cache_delete( $signup_id, 'post_meta' );
			if ( (string) get_post_meta( $signup_id, $key, true ) !== (string) $value ) {
				wp_delete_post( $signup_id, true );
				return new WP_Error( 'fenix_signup_save_failed', sprintf( 'Could not save signup field %s.', $key ), array( 'status' => 500 ) );
			}
		}
		$published_id = wp_update_post(
			array( 'ID' => $signup_id, 'post_status' => 'publish' ),
			true
		);
		if ( is_wp_error( $published_id ) ) {
			wp_delete_post( $signup_id, true );
			return $published_id;
		}
		clean_post_cache( $signup_id );
		$published = get_post( $signup_id );
		if ( ! $published || 'publish' !== $published->post_status ) {
			wp_delete_post( $signup_id, true );
			return new WP_Error( 'fenix_signup_save_failed', 'The signup could not be published.', array( 'status' => 500 ) );
		}
		$result = fenix_finish_count_change( $event_id, $count + 1 );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( array( 'id' => $signup_id ), 201 );
	} );
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

	$event_id = absint( get_post_meta( $signup->ID, 'event_id', true ) );
	if ( ! $event_id ) {
		return new WP_Error( 'fenix_invalid_event', 'Invalid event ID.', array( 'status' => 400 ) );
	}
	return fenix_with_event_lock( $event_id, static function () use ( $signup, $event_id ) {
		// Fix 3: discard routing-time cache before any ownership or status decision.
		wp_cache_delete( $signup->ID, 'post_meta' );
		clean_post_cache( $signup->ID );
		$fresh = get_post( $signup->ID );
		if ( ! $fresh || 'event_signup' !== $fresh->post_type || 'publish' !== $fresh->post_status ) {
			return new WP_Error( 'fenix_signup_not_found', 'The signup does not exist.', array( 'status' => 404 ) );
		}
		if ( absint( get_post_meta( $fresh->ID, 'event_id', true ) ) !== $event_id ) {
			return new WP_Error( 'fenix_signup_changed', 'The signup event changed; retry.', array( 'status' => 409 ) );
		}
		$member_id = absint( get_post_meta( $fresh->ID, 'member_id', true ) );
		if ( ! $member_id ) {
			return new WP_Error( 'fenix_invalid_signup', 'The signup has no valid member.', array( 'status' => 400 ) );
		}
		if ( $member_id !== get_current_user_id() && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'fenix_forbidden_signup', 'You can only cancel your own signup.', array( 'status' => 403 ) );
		}
		if ( get_post_meta( $fresh->ID, 'cancelled_at', true ) ) {
			return new WP_Error( 'fenix_signup_cancelled', 'The signup is already cancelled.', array( 'status' => 409 ) );
		}
		$count = fenix_prepare_event_count( $event_id );
		if ( is_wp_error( $count ) ) {
			return $count;
		}
		$matching = array();
		foreach ( fenix_event_signup_ids( $event_id ) as $id ) {
			wp_cache_delete( $id, 'post_meta' );
			if ( absint( get_post_meta( $id, 'member_id', true ) ) === $member_id && ! get_post_meta( $id, 'cancelled_at', true ) ) {
				$matching[] = $id;
			}
		}
		if ( ! $matching ) {
			return new WP_Error( 'fenix_signup_not_found', 'The active signup does not exist.', array( 'status' => 404 ) );
		}
		$removed = get_userdata( $member_id ) ? 1 + count( fenix_signup_guests( $matching[0] ) ) : 0;
		$dirty = fenix_mark_count_dirty( $event_id );
		if ( is_wp_error( $dirty ) ) {
			return $dirty;
		}
		// Fix 5: published posts use cancelled_at as their cancellation status.
		foreach ( $matching as $id ) {
			if ( ! fenix_write_verified_meta( $id, 'cancelled_by', get_current_user_id() )
				|| ! fenix_write_verified_meta( $id, 'cancelled_at', current_time( 'mysql' ) ) ) {
				return new WP_Error( 'fenix_signup_cancel_failed', 'Cancellation was only partially saved; the count will be rebuilt on the next change.', array( 'status' => 500 ) );
			}
		}
		$result = fenix_finish_count_change( $event_id, $count - $removed );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( array( 'cancelled' => true ) );
	} );
}

function fenix_owned_active_signup( $signup_id ) {
	$signup = get_post( $signup_id );
	if ( ! $signup || 'event_signup' !== $signup->post_type || 'publish' !== $signup->post_status ) {
		return new WP_Error( 'fenix_signup_not_found', 'The signup does not exist.', array( 'status' => 404 ) );
	}
	if ( (int) get_post_meta( $signup_id, 'member_id', true ) !== get_current_user_id() ) {
		return new WP_Error( 'fenix_forbidden_signup', 'You can only manage your own guests.', array( 'status' => 403 ) );
	}
	if ( get_post_meta( $signup_id, 'cancelled_at', true ) ) {
		return new WP_Error( 'fenix_signup_cancelled', 'Sign up before managing guests.', array( 'status' => 409 ) );
	}
	return $signup;
}

function fenix_current_member_signup( $event_id, $member_id ) {
	foreach ( fenix_event_signup_ids( $event_id ) as $id ) {
		wp_cache_delete( $id, 'post_meta' );
		if ( absint( get_post_meta( $id, 'member_id', true ) ) === $member_id && ! get_post_meta( $id, 'cancelled_at', true ) ) {
			return (int) $id;
		}
	}
	return 0;
}

function fenix_add_event_guest( WP_REST_Request $request ) {
	$signup_id = absint( $request->get_param( 'id' ) );
	$raw_name = $request->get_param( 'name' );
	if ( ! isset( $raw_name ) || '' === trim( (string) $raw_name ) ) {
		return new WP_Error( 'fenix_invalid_guest', 'Ange ett giltigt gästnamn (max 200 byte).', array( 'status' => 400 ) );
	}
	$name = trim( sanitize_text_field( $raw_name ) );
	if ( '' === $name || strlen( $name ) > 200 ) {
		return new WP_Error( 'fenix_invalid_guest', 'Ange ett giltigt gästnamn (max 200 byte).', array( 'status' => 400 ) );
	}
	$event_id = absint( get_post_meta( $signup_id, 'event_id', true ) );
	if ( ! $event_id ) {
		return new WP_Error( 'fenix_signup_not_found', 'The signup does not exist.', array( 'status' => 404 ) );
	}
	return fenix_with_event_lock( $event_id, static function () use ( $signup_id, $event_id, $name ) {
		wp_cache_delete( $signup_id, 'post_meta' );
		clean_post_cache( $signup_id );
		clean_post_cache( $event_id );
		$signup = fenix_owned_active_signup( $signup_id );
		if ( is_wp_error( $signup ) ) {
			return $signup;
		}
		if ( absint( get_post_meta( $signup_id, 'event_id', true ) ) !== $event_id ) {
			return new WP_Error( 'fenix_signup_changed', 'The signup event changed; retry.', array( 'status' => 409 ) );
		}
		$event = get_post( $event_id );
		if ( ! $event || 'event' !== $event->post_type || 'publish' !== $event->post_status ) {
			return new WP_Error( 'fenix_invalid_event', 'The event is not available.', array( 'status' => 404 ) );
		}
		if ( fenix_current_member_signup( $event_id, get_current_user_id() ) !== $signup_id ) {
			return new WP_Error( 'fenix_duplicate_signup', 'Use your current signup to manage guests.', array( 'status' => 409 ) );
		}
		$guests = fenix_signup_guests( $signup_id );
		foreach ( $guests as $guest ) {
			if ( preg_match( '/\A' . preg_quote( $name, '/' ) . '\z/iu', $guest['name'] ) ) {
				return new WP_Error( 'fenix_duplicate_guest', 'Gästen finns redan i din anmälan.', array( 'status' => 409 ) );
			}
		}
		$count = fenix_prepare_event_count( $event_id );
		if ( is_wp_error( $count ) ) {
			return $count;
		}
		$capacity_error = fenix_event_capacity_error( $event_id );
		if ( $capacity_error ) {
			return $capacity_error;
		}
		$guest = array( 'id' => wp_generate_uuid4(), 'name' => $name );
		$guests[] = $guest;
		$dirty = fenix_mark_count_dirty( $event_id );
		if ( is_wp_error( $dirty ) ) {
			return $dirty;
		}
		if ( ! update_post_meta( $signup_id, 'fenix_guests', $guests ) ) {
			return new WP_Error( 'fenix_guest_save_failed', 'The guest could not be saved.', array( 'status' => 500 ) );
		}
		$result = fenix_finish_count_change( $event_id, $count + 1 );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( $guest, 201 );
	} );
}

function fenix_remove_event_guest( WP_REST_Request $request ) {
	$signup_id = absint( $request->get_param( 'id' ) );
	$event_id = absint( get_post_meta( $signup_id, 'event_id', true ) );
	if ( ! $event_id ) {
		if ( ! get_post( $signup_id ) ) {
			return new WP_Error( 'fenix_signup_not_found', 'The signup does not exist.', array( 'status' => 404 ) );
		}
		return new WP_Error( 'fenix_invalid_event', 'Invalid event ID.', array( 'status' => 400 ) );
	}
	$guest_id = $request->get_param( 'guest_id' );
	return fenix_with_event_lock( $event_id, static function () use ( $signup_id, $guest_id, $event_id ) {
		wp_cache_delete( $signup_id, 'post_meta' );
		clean_post_cache( $signup_id );
		$signup = fenix_owned_active_signup( $signup_id );
		if ( is_wp_error( $signup ) ) {
			return $signup;
		}
		if ( absint( get_post_meta( $signup_id, 'event_id', true ) ) !== $event_id ) {
			return new WP_Error( 'fenix_signup_changed', 'The signup event changed; retry.', array( 'status' => 409 ) );
		}
		$count = fenix_prepare_event_count( $event_id );
		if ( is_wp_error( $count ) ) {
			return $count;
		}
		$is_counted = fenix_current_member_signup( $event_id, get_current_user_id() ) === $signup_id;
		$guests = fenix_signup_guests( $signup_id );
		$remaining = array_values( array_filter( $guests, static function ( $guest ) use ( $guest_id ) {
			return $guest['id'] !== $guest_id;
		} ) );
		if ( count( $remaining ) === count( $guests ) ) {
			return new WP_Error( 'fenix_guest_not_found', 'The guest does not exist.', array( 'status' => 404 ) );
		}
		$dirty = fenix_mark_count_dirty( $event_id );
		if ( is_wp_error( $dirty ) ) {
			return $dirty;
		}
		if ( ! update_post_meta( $signup_id, 'fenix_guests', $remaining ) ) {
			return new WP_Error( 'fenix_guest_save_failed', 'The guest could not be removed.', array( 'status' => 500 ) );
		}
		$result = fenix_finish_count_change( $event_id, $count - ( $is_counted ? 1 : 0 ) );
		return is_wp_error( $result ) ? $result : new WP_REST_Response( array( 'removed' => true ) );
	} );
}
