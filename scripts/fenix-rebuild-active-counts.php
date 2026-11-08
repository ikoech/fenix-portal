<?php
/**
 * After deploying, from the repository root run:
 * wp --path=app\public eval-file scripts\fenix-rebuild-active-counts.php
 *
 * WordPress and the Fenix must-use plugin must already be loaded by WP-CLI.
 * Each output line reports the rebuilt event ID and active attendee count.
 * Missing counters also rebuild on the first mutation. The weekly WP-Cron
 * rebuild corrects drift but does not replace locked mutation updates.
 *
 * Must-use plugins do not receive activation/deactivation hooks. After removing
 * the plugin, remove its scheduled event with:
 * wp --path=app\public cron event delete fenix_rebuild_all_counts
 * Cancellation actor display names are lost if the actor account is deleted.
 */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( "Run this script with WP-CLI eval-file.\n" );
}

$signups = get_posts(
	array(
		'post_type'      => 'event_signup',
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	)
);
$event_ids = array();
$invalid = 0;
foreach ( $signups as $signup_id ) {
	wp_cache_delete( $signup_id, 'post_meta' );
	$event_id = absint( get_post_meta( $signup_id, 'event_id', true ) );
	if ( ! $event_id ) {
		WP_CLI::warning( sprintf( 'Signup %d has no event ID.', $signup_id ) );
		++$invalid;
		continue;
	}
	$event_ids[ $event_id ] = true;
}

foreach ( array_keys( $event_ids ) as $event_id ) {
	$count = fenix_rebuild_active_counts( (int) $event_id );
	if ( is_wp_error( $count ) ) {
		WP_CLI::warning( sprintf( 'Event %d: %s', $event_id, $count->get_error_message() ) );
		++$invalid;
		continue;
	}
	WP_CLI::log( sprintf( 'Event %d: %d active attendees', $event_id, $count ) );
}

if ( $invalid ) {
	WP_CLI::error( sprintf( 'Migration incomplete: %d invalid signup(s) or failed event(s).', $invalid ) );
}
WP_CLI::success( sprintf( 'Rebuilt counts for %d events.', count( $event_ids ) ) );
