<?php
// Isolated WordPress API simulation. No live database records are modified.
define( 'ABSPATH', __DIR__ );
$GLOBALS['test_routes'] = array();
$GLOBALS['test_actions'] = array();
$GLOBALS['test_scheduled'] = false;
$GLOBALS['test_posts'] = array();
$GLOBALS['test_meta'] = array();
$GLOBALS['test_meta_cache'] = array();
$GLOBALS['test_fail_keys'] = array();
$GLOBALS['test_on_lock'] = null;
$GLOBALS['test_users'] = array(
	1 => (object) array( 'ID' => 1, 'display_name' => 'Alice', 'user_email' => 'alice@example.com' ),
	2 => (object) array( 'ID' => 2, 'display_name' => 'Bob', 'user_email' => 'bob@example.com' ),
	3 => (object) array( 'ID' => 3, 'display_name' => 'Admin', 'user_email' => 'admin@example.com' ),
);
$GLOBALS['test_user_meta'] = array();
$GLOBALS['test_user'] = 1;
$GLOBALS['test_next_id'] = 100;
$GLOBALS['test_uuid'] = 0;

class WP_REST_Server {
	const READABLE = 'GET';
	const CREATABLE = 'POST';
	const DELETABLE = 'DELETE';
}
class WP_REST_Request {
	private $params;
	public function __construct( $params = array() ) { $this->params = $params; }
	public function get_param( $name ) { return isset( $this->params[ $name ] ) ? $this->params[ $name ] : null; }
}
class WP_REST_Response {
	private $data;
	public function __construct( $data, $status = 200 ) { $this->data = $data; }
	public function get_data() { return $this->data; }
}
class WP_Error {
	public $code;
	public $data;
	public function __construct( $code, $message, $data ) { $this->code = $code; $this->data = $data; }
}
class TestDB {
	public $prefix = 'wp_';
	public $locked = false;
	public function prepare( $query, ...$args ) { return $query; }
	public function get_var( $query ) {
		if ( false !== strpos( $query, 'GET_LOCK' ) ) {
			if ( $this->locked ) { return '0'; }
			if ( $GLOBALS['test_on_lock'] ) {
				$callback = $GLOBALS['test_on_lock'];
				$GLOBALS['test_on_lock'] = null;
				$callback();
			}
		}
		return '1';
	}
}
$GLOBALS['wpdb'] = new TestDB();
function add_action( $hook, $fn ) {
	if ( 'rest_api_init' === $hook ) { $fn(); }
	else { $GLOBALS['test_actions'][ $hook ] = $fn; }
}
function add_filter( ...$args ) {}
function register_deactivation_hook( $file, $callback ) { $GLOBALS['test_deactivation'] = $callback; }
function wp_next_scheduled( $hook ) { return $GLOBALS['test_scheduled']; }
function wp_schedule_event( $time, $recurrence, $hook, $args, $error ) {
	$GLOBALS['test_scheduled'] = array( 'recurrence' => $recurrence, 'hook' => $hook );
	return true;
}
function wp_clear_scheduled_hook( $hook, $args, $error ) { $GLOBALS['test_scheduled'] = false; return 1; }
function register_rest_route( $namespace, $route, $args ) { $GLOBALS['test_routes'][ $route ] = $args; }
function is_user_logged_in() { return $GLOBALS['test_user'] > 0; }
function current_user_can( $cap ) { return 'read' === $cap ? is_user_logged_in() : ( 'manage_options' === $cap && 3 === $GLOBALS['test_user'] ); }
function get_current_user_id() { return $GLOBALS['test_user']; }
function absint( $value ) { return abs( (int) $value ); }
function get_post( $id ) { return isset( $GLOBALS['test_posts'][ $id ] ) ? $GLOBALS['test_posts'][ $id ] : null; }
function get_post_meta( $id, $key, $single ) {
	if ( ! isset( $GLOBALS['test_meta_cache'][ $id ] ) ) {
		$GLOBALS['test_meta_cache'][ $id ] = isset( $GLOBALS['test_meta'][ $id ] ) ? $GLOBALS['test_meta'][ $id ] : array();
	}
	return isset( $GLOBALS['test_meta_cache'][ $id ][ $key ] ) ? $GLOBALS['test_meta_cache'][ $id ][ $key ] : '';
}
function wp_cache_delete( $id, $group ) { if ( 'post_meta' === $group ) { unset( $GLOBALS['test_meta_cache'][ $id ] ); } return true; }
function clean_post_cache( $id ) { wp_cache_delete( $id, 'post_meta' ); }
function update_post_meta( $id, $key, $value ) {
	if ( in_array( $key, $GLOBALS['test_fail_keys'], true ) ) { return false; }
	$unchanged = isset( $GLOBALS['test_meta'][ $id ][ $key ] ) && $GLOBALS['test_meta'][ $id ][ $key ] === $value;
	$GLOBALS['test_meta'][ $id ][ $key ] = $value;
	wp_cache_delete( $id, 'post_meta' );
	return ! $unchanged;
}
function update_field( $key, $value, $id ) { return update_post_meta( $id, $key, $value ); }
function get_userdata( $id ) { return isset( $GLOBALS['test_users'][ $id ] ) ? $GLOBALS['test_users'][ $id ] : false; }
function get_user_meta( $id, $key, $single ) { return isset( $GLOBALS['test_user_meta'][ $id ][ $key ] ) ? $GLOBALS['test_user_meta'][ $id ][ $key ] : ''; }
function get_users( $args ) { return array_values( $GLOBALS['test_users'] ); }
function remove_accents( $value ) { return $value; }
function fenix_get_member_profile_data( $id ) {
	$user = get_userdata( $id );
	$acf = array();
	foreach ( array( 'company', 'expertise', 'specific_search', 'deputy' ) as $field ) {
		$acf[ $field ] = get_user_meta( $id, $field, true );
	}
	return array( 'id' => $id, 'name' => $user->display_name, 'acf' => $acf );
}
function fenix_get_public_member_profile_data( $id ) {
	return array( 'id' => $id, 'name' => $GLOBALS['test_users'][ $id ]->display_name, 'acf' => array( 'photo' => '', 'company' => get_user_meta( $id, 'company', true ) ) );
}
function get_the_title( $id ) { return isset( $GLOBALS['test_posts'][ $id ]->post_title ) ? $GLOBALS['test_posts'][ $id ]->post_title : ''; }
function get_posts( $args ) {
	$ids = array();
	foreach ( $GLOBALS['test_posts'] as $id => $post ) {
		if ( $post->post_type !== $args['post_type'] || $post->post_status !== $args['post_status'] ) { continue; }
		if ( isset( $args['meta_key'] ) && (string) get_post_meta( $id, $args['meta_key'], true ) !== (string) $args['meta_value'] ) { continue; }
		$ids[] = $id;
	}
	if ( isset( $args['orderby'] ) ) { rsort( $ids ); }
	return $ids;
}
function wp_insert_post( $args, $error ) {
	$id = $GLOBALS['test_next_id']++;
	$GLOBALS['test_posts'][ $id ] = (object) array_merge( array( 'post_date' => '2026-11-08 12:00:00' ), $args, array( 'ID' => $id ) );
	return $id;
}
function wp_update_post( $args, $error ) {
	$GLOBALS['test_posts'][ $args['ID'] ]->post_status = $args['post_status'];
	return $args['ID'];
}
function wp_delete_post( $id, $force ) { unset( $GLOBALS['test_posts'][ $id ] ); }
function current_time( $type ) { return '2026-11-08 12:00:00'; }
function wp_generate_uuid4() { return sprintf( '00000000-0000-4000-8000-%012d', ++$GLOBALS['test_uuid'] ); }
function sanitize_text_field( $value ) { return strip_tags( $value ); }
function sanitize_email( $value ) { return filter_var( $value, FILTER_SANITIZE_EMAIL ); }
function is_email( $value ) { return filter_var( $value, FILTER_VALIDATE_EMAIL ); }
function rest_ensure_response( $data ) { return new WP_REST_Response( $data ); }
function is_wp_error( $value ) { return $value instanceof WP_Error; }

require __DIR__ . '/../app/public/wp-content/mu-plugins/fenix-event-signups.php';

function check( $condition, $message ) {
	if ( ! $condition ) { throw new RuntimeException( $message ); }
}
function check_error( $actual, $code ) {
	check( is_wp_error( $actual ) && $actual->code === $code, "Expected error $code" );
}
function request( $params ) { return new WP_REST_Request( $params ); }
function dispatch_route( $route, $params ) {
	$definition = $GLOBALS['test_routes'][ $route ];
	if ( ! call_user_func( $definition['permission_callback'] ) ) {
		return new WP_Error( 'rest_forbidden', 'Forbidden.', array( 'status' => 403 ) );
	}
	return call_user_func( $definition['callback'], request( $params ) );
}
function summary() { return fenix_get_event_signup_summary()->get_data(); }
function count_event( $event ) { $counts = summary()['counts']; return isset( $counts->$event ) ? $counts->$event : 0; }
function counter( $event ) { return (int) get_post_meta( $event, '_fenix_active_count', true ); }
function signup( $event ) { return fenix_create_event_signup( request( array( 'event_id' => $event ) ) ); }
function guest( $signup, $name, $email = 'guest@example.com' ) {
	$result = fenix_add_event_guest( request( array( 'id' => $signup, 'name' => $name, 'email' => $email ) ) );
	if ( is_wp_error( $result ) ) { return $result; }
	$guest = $result->get_data();
	$approved = fenix_approve_guest( request( array( 'id' => $guest['id'] ) ) );
	if ( is_wp_error( $approved ) ) {
		if ( 'fenix_event_full' === $approved->code ) {
			fenix_remove_event_guest( request( array( 'id' => $signup, 'guest_id' => $guest['id'] ) ) );
		}
		return $approved;
	}
	$guest['status'] = 'active';
	return new WP_REST_Response( $guest, 201 );
}

call_user_func( $GLOBALS['test_actions']['init'] );
check( 'weekly' === $GLOBALS['test_scheduled']['recurrence'], 'Weekly rebuild is scheduled' );
call_user_func( $GLOBALS['test_deactivation'] );
check( false === $GLOBALS['test_scheduled'], 'Deactivation unschedules rebuild' );
call_user_func( $GLOBALS['test_actions']['init'] );

foreach ( $GLOBALS['test_routes'] as $route => $definitions ) {
	$definitions = isset( $definitions['permission_callback'] ) ? array( $definitions ) : $definitions;
	foreach ( $definitions as $definition ) {
		$GLOBALS['test_user'] = 0;
		check( ! call_user_func( $definition['permission_callback'] ), "Anonymous access denied for $route" );
		$GLOBALS['test_user'] = 1;
		$admin_only = '/guests/pending' === $route || false !== strpos( $route, '/guests/(?P<id>' );
		check( $admin_only ? ! call_user_func( $definition['permission_callback'] ) : call_user_func( $definition['permission_callback'] ), "Permission is correct for member on $route" );
		$GLOBALS['test_user'] = 3;
		check( call_user_func( $definition['permission_callback'] ), "Admin access allowed for $route" );
	}
}
$GLOBALS['test_user'] = 1;

$GLOBALS['test_posts'][10] = (object) array( 'ID' => 10, 'post_type' => 'event', 'post_status' => 'publish' );
$GLOBALS['test_meta'][10]['max_attendees'] = 3;
check_error( signup( -10 ), 'fenix_invalid_event' );
check_error( signup( 999 ), 'fenix_invalid_event' );
$GLOBALS['wpdb']->locked = true;
check_error( signup( 10 ), 'fenix_event_busy' );
$GLOBALS['wpdb']->locked = false;
$first = signup( 10 )->get_data()['id'];
check( 1 === counter( 10 ), 'Signup increments counter' );
check( get_post_meta( $first, 'member_id', true ) === 1, 'Member is taken from authenticated session' );
check_error( signup( 10 ), 'fenix_duplicate_signup' );
check_error( guest( $first, '   ' ), 'fenix_invalid_guest' );
check_error( fenix_add_event_guest( request( array( 'id' => $first, 'name' => 'Guest' ) ) ), 'fenix_invalid_guest_email' );
check_error( guest( $first, 'Guest', '  ' ), 'fenix_invalid_guest_email' );
check_error( guest( $first, 'Guest', 'not-an-email' ), 'fenix_invalid_guest_email' );
check_error( guest( $first, 'Guest', 'a<script>@example.com' ), 'fenix_invalid_guest_email' );
check_error( guest( $first, 'Guest', str_repeat( 'a', 250 ) . '@example.com' ), 'fenix_invalid_guest_email' );
check( 1 === counter( 10 ), 'Invalid guest emails do not change attendance' );
$pending = fenix_add_event_guest( request( array( 'id' => $first, 'name' => 'Pending Guest', 'email' => 'pending@example.com', 'company' => '  Example AB  ' ) ) )->get_data();
check( 'pending' === $pending['status'] && 'Example AB' === $pending['company'], 'New guest defaults to pending with sanitized company' );
check( 1 === counter( 10 ), 'Pending guest does not count toward capacity' );
fenix_remove_event_guest( request( array( 'id' => $first, 'guest_id' => $pending['id'] ) ) );
check( 1 === counter( 10 ), 'Removing pending guest does not change capacity' );
check_error( guest( 999, 'No signup' ), 'fenix_signup_not_found' );
$one = guest( $first, '  Åsa  ' )->get_data();
check( 2 === counter( 10 ), 'Adding guest increments counter' );
check( 'Åsa' === $one['name'], 'Guest names are trimmed' );
check_error( guest( $first, 'åSA' ), 'fenix_duplicate_guest' );
$two = guest( $first, 'Guest Two', '  two@example.com  ' )->get_data();
check( 'two@example.com' === $two['email'], 'Guest email is trimmed and returned' );
check( 'active' === $two['status'], 'Test helper confirms guest approval state' );
check( 'two@example.com' === fenix_signup_guests( $first )[1]['email'], 'Guest email persists with signup' );
check( 3 === count_event( 10 ), 'Member plus two guests count toward capacity' );
check_error( guest( $first, 'Guest Three' ), 'fenix_event_full' );
$GLOBALS['test_user'] = 2;
check_error( signup( 10 ), 'fenix_event_full' );
check_error( guest( $first, 'Intruder' ), 'fenix_forbidden_signup' );
check_error( fenix_remove_event_guest( request( array( 'id' => $first, 'guest_id' => $one['id'] ) ) ), 'fenix_forbidden_signup' );
check_error( fenix_delete_event_signup( request( array( 'id' => $first ) ) ), 'fenix_forbidden_signup' );
$GLOBALS['test_user'] = 1;
fenix_remove_event_guest( request( array( 'id' => $first, 'guest_id' => $one['id'] ) ) );
check( 2 === counter( 10 ), 'Removing guest decrements counter' );
check( 2 === count_event( 10 ), 'Removing one guest updates count' );
$GLOBALS['test_user'] = 2;
$second = signup( 10 )->get_data()['id'];
check( 3 === count_event( 10 ), 'Second member fills released capacity' );
$GLOBALS['test_user'] = 1;
$active = summary()['attendees']->{10};
$guest_rows = array_values( array_filter( $active, static function ( $row ) { return 'guest' === $row['type']; } ) );
check( 'Alice' === $guest_rows[0]['inviter_name'] && $guest_rows[0]['id'] === $two['id'], 'Guest attribution is returned' );
check( 'two@example.com' === $guest_rows[0]['email'], 'Active roster includes guest email' );
check( summary()['breakdown']->{10} === array( 'members' => 2, 'guests' => 1 ), 'Breakdown matches roster' );
fenix_delete_event_signup( request( array( 'id' => $first ) ) );
check( 1 === counter( 10 ), 'Cancellation decrements member and guest' );
check( 1 === count_event( 10 ), 'Cancellation releases member and guest capacity' );
$history = summary()['cancelled']->{10};
check( 2 === count( $history ) && 'Alice' === $history[1]['cancelled_by'], 'Cancellation retains guest and actor' );
check( 'two@example.com' === $history[1]['email'], 'Cancelled roster retains guest email' );
check_error( guest( $first, 'Late' ), 'fenix_signup_cancelled' );
$again = signup( 10 )->get_data()['id'];
check( $again !== $first && 2 === count_event( 10 ), 'Re-signup creates a new record without restoring guests' );
check( 2 === count( summary()['cancelled']->{10} ), 'Re-signup retains cancellation history' );
$duplicate = wp_insert_post( array( 'post_type' => 'event_signup', 'post_status' => 'publish' ), true );
update_post_meta( $duplicate, 'event_id', 10 );
update_post_meta( $duplicate, 'member_id', 1 );
check( 2 === count_event( 10 ), 'Legacy duplicate members count only once' );
check_error( guest( $again, 'Hidden Guest' ), 'fenix_duplicate_signup' );
$GLOBALS['test_user'] = 3;
fenix_delete_event_signup( request( array( 'id' => $again ) ) );
check( get_post_meta( $duplicate, 'cancelled_at', true ) !== '', 'Cancelling also closes legacy duplicates' );
$cancelled_rows = summary()['cancelled']->{10};
check( count( array_filter( $cancelled_rows, static function ( $row ) { return 'Admin' === $row['cancelled_by']; } ) ) >= 2, 'Admin cancellation actor is recorded' );
check( 1 === count_event( 10 ), 'Duplicate cancellation releases capacity' );
check( ! isset( summary()['signupIds']->{10} ), 'Cancelled signup is not reported as active' );
unset( $GLOBALS['test_users'][2] );
check( 0 === count_event( 10 ), 'Deleted users are not counted' );
$GLOBALS['test_posts'][11] = (object) array( 'ID' => 11, 'post_type' => 'event', 'post_status' => 'publish' );
$GLOBALS['test_user'] = 1;
$multiple = signup( 11 )->get_data()['id'];
$guest_a = guest( $multiple, 'Guest A' )->get_data();
$guest_b = guest( $multiple, 'Guest B' )->get_data();
fenix_remove_event_guest( request( array( 'id' => $multiple, 'guest_id' => $guest_a['id'] ) ) );
fenix_remove_event_guest( request( array( 'id' => $multiple, 'guest_id' => $guest_b['id'] ) ) );
check_error( fenix_remove_event_guest( request( array( 'id' => $multiple, 'guest_id' => $guest_b['id'] ) ) ), 'fenix_guest_not_found' );
check( 1 === count_event( 11 ), 'Removing multiple guests leaves only the member' );

$zero = guest( $multiple, '0' )->get_data();
check( 2 === count_event( 11 ) && 2 === counter( 11 ), 'Guest named zero is visible and counted' );
check_error( guest( $multiple, '0' ), 'fenix_duplicate_guest' );
fenix_remove_event_guest( request( array( 'id' => $multiple, 'guest_id' => $zero['id'] ) ) );
check( 1 === counter( 11 ), 'Guest named zero can be removed' );

update_post_meta( 11, 'max_attendees', 2 );
update_post_meta( 11, '_fenix_active_count', 2 );
$full = guest( $multiple, 'Counter full' );
check_error( $full, 'fenix_event_full' );
check( 409 === $full->data['status'], 'Counter-based capacity denial returns HTTP 409' );
check( 1 === fenix_rebuild_active_counts( 11 ) && 1 === counter( 11 ), 'Rebuild corrects counter from records' );

$GLOBALS['test_on_lock'] = static function () use ( $multiple ) {
	$GLOBALS['test_meta'][ $multiple ]['cancelled_at'] = '2026-11-08 13:00:00';
};
check_error( guest( $multiple, 'After cancellation' ), 'fenix_signup_cancelled' );
unset( $GLOBALS['test_meta'][ $multiple ]['cancelled_at'] );
wp_cache_delete( $multiple, 'post_meta' );

$GLOBALS['test_on_lock'] = static function () use ( $multiple ) {
	$GLOBALS['test_meta'][ $multiple ]['member_id'] = 3;
};
check_error( fenix_remove_event_guest( request( array( 'id' => $multiple, 'guest_id' => $zero['id'] ) ) ), 'fenix_forbidden_signup' );
$GLOBALS['test_meta'][ $multiple ]['member_id'] = 1;
wp_cache_delete( $multiple, 'post_meta' );

$GLOBALS['test_posts'][12] = (object) array( 'ID' => 12, 'post_type' => 'event', 'post_status' => 'publish' );
$GLOBALS['test_fail_keys'] = array( 'event_id' );
check_error( signup( 12 ), 'fenix_signup_save_failed' );
check( 0 === count_event( 12 ), 'Failed signup fields do not publish partial records' );
$GLOBALS['test_fail_keys'] = array();
$recovered = signup( 12 )->get_data()['id'];
check( 1 === counter( 12 ), 'Dirty counter is rebuilt after failed write' );

$GLOBALS['test_fail_keys'] = array( '_fenix_active_count' );
check_error( guest( $recovered, 'Recovered guest' ), 'fenix_count_save_failed' );
check( '1' === get_post_meta( 12, '_fenix_count_dirty', true ), 'Counter failure leaves recovery marker' );
$GLOBALS['test_fail_keys'] = array();
check_error( guest( $recovered, 'Recovered guest' ), 'fenix_duplicate_guest' );
guest( $recovered, 'Next guest' );
check( 3 === counter( 12 ) && 3 === count_event( 12 ), 'Next mutation rebuilds dirty counter before changing it' );

$GLOBALS['test_fail_keys'] = array( 'cancelled_by' );
check_error( fenix_delete_event_signup( request( array( 'id' => $recovered ) ) ), 'fenix_signup_cancel_failed' );
check( '1' === get_post_meta( 12, '_fenix_count_dirty', true ), 'Failed cancellation leaves recovery marker' );
$GLOBALS['test_fail_keys'] = array();
fenix_delete_event_signup( request( array( 'id' => $recovered ) ) );
check( 0 === counter( 12 ) && 0 === count_event( 12 ), 'Cancellation recovers and counts all guests' );

$GLOBALS['test_posts'][13] = (object) array( 'ID' => 13, 'post_type' => 'event', 'post_status' => 'publish' );
update_post_meta( 13, 'max_attendees', 5 );
$race_signup = signup( 13 )->get_data()['id'];
get_post_meta( 13, '_fenix_active_count', true );
$GLOBALS['test_on_lock'] = static function () {
	$GLOBALS['test_meta'][13]['_fenix_active_count'] = 5;
};
check_error( guest( $race_signup, 'Counter changed while waiting' ), 'fenix_event_full' );
check( 1 === fenix_rebuild_active_counts( 13 ), 'Rebuild resets simulated counter drift' );
$GLOBALS['test_on_lock'] = static function () use ( $race_signup ) {
	$GLOBALS['test_meta'][ $race_signup ]['fenix_guests'] = array( array( 'id' => 'a-1', 'name' => 'Other request' ) );
	$GLOBALS['test_meta'][13]['_fenix_active_count'] = 2;
};
guest( $race_signup, 'After wait' );
check( 3 === counter( 13 ) && 2 === count( fenix_signup_guests( $race_signup ) ), 'Post-lock guest read retains concurrent change' );
check( 3 === count_event( 13 ), 'Counter matches roster after post-lock reread' );
$legacy_rows = summary()['attendees']->{13};
$legacy = array_values( array_filter( $legacy_rows, static function ( $row ) { return 'Other request' === $row['name']; } ) );
check( isset( $legacy[0]['email'] ) && '' === $legacy[0]['email'], 'Legacy guests without email remain visible' );
fenix_remove_event_guest( request( array( 'id' => $race_signup, 'guest_id' => 'a-1' ) ) );
check( 2 === counter( 13 ), 'Legacy guest without email remains removable' );
check( fenix_write_verified_meta( 13, '_fenix_active_count', 2 ), 'Unchanged metadata is accepted when read-back matches' );
update_post_meta( 13, '_fenix_active_count', 99 );
fenix_rebuild_all_counts();
check( 2 === counter( 13 ), 'Weekly rebuild repairs drift' );

$GLOBALS['test_posts'][14] = (object) array( 'ID' => 14, 'post_type' => 'event', 'post_status' => 'publish', 'post_title' => 'Approval Event' );
update_post_meta( 14, 'event_date', '20261201' );
update_post_meta( 14, 'max_attendees', 3 );
$GLOBALS['test_user'] = 1;
$approval_signup = signup( 14 )->get_data()['id'];
$pending_approval = fenix_add_event_guest( request( array( 'id' => $approval_signup, 'name' => 'Approved Guest', 'email' => 'approved@example.com', 'company' => 'Example AB' ) ) )->get_data();
$approve_route = '/guests/(?P<id>[a-f0-9-]+)/approve';
$reject_route = '/guests/(?P<id>[a-f0-9-]+)/reject';
check( 1 === counter( 14 ), 'Pending guest does not increment approval event count' );
check_error( dispatch_route( $approve_route, array( 'id' => $pending_approval['id'] ) ), 'rest_forbidden' );
check( 403 === dispatch_route( $reject_route, array( 'id' => $pending_approval['id'] ) )->data['status'], 'Non-admin rejection returns 403' );
$GLOBALS['test_user'] = 3;
$pending_rows = fenix_get_pending_guests()->get_data();
$pending_row = array_values( array_filter( $pending_rows, static function ( $row ) use ( $pending_approval ) { return $row['id'] === $pending_approval['id']; } ) )[0];
check( 'Alice' === $pending_row['inviter_name'] && 'Approval Event' === $pending_row['event_name'] && '20261201' === $pending_row['event_date'], 'Pending guest listing includes inviter and event details' );
$approved = dispatch_route( $approve_route, array( 'id' => $pending_approval['id'] ) )->get_data();
check( 'active' === $approved['status'] && 2 === counter( 14 ), 'Admin approval activates guest and increments count' );
$GLOBALS['test_user_meta'][1]['company'] = 'Alice Co';
$approval_roster = summary()['attendees']->{14};
$approved_roster_guest = array_values( array_filter( $approval_roster, static function ( $row ) use ( $pending_approval ) { return $row['id'] === $pending_approval['id']; } ) )[0];
check( 'active' === $approved_roster_guest['status'] && 'approved@example.com' === $approved_roster_guest['email'] && 'Example AB' === $approved_roster_guest['company'], 'Roster includes guest status, email and company' );
$member_roster_row = array_values( array_filter( $approval_roster, static function ( $row ) { return 'member' === $row['type']; } ) )[0];
check( 'alice@example.com' === $member_roster_row['email'] && 'Alice Co' === $member_roster_row['company'], 'Roster includes member email and company' );
check_error( dispatch_route( $approve_route, array( 'id' => $pending_approval['id'] ) ), 'fenix_guest_not_pending' );
$GLOBALS['test_user'] = 1;
$pending_rejection = fenix_add_event_guest( request( array( 'id' => $approval_signup, 'name' => 'Rejected Guest', 'email' => 'rejected@example.com' ) ) )->get_data();
$GLOBALS['test_user'] = 3;
$rejected = dispatch_route( $reject_route, array( 'id' => $pending_rejection['id'] ) )->get_data();
check( 'rejected' === $rejected['status'] && 2 === counter( 14 ), 'Admin rejection records status without changing count' );
$rejected_roster_guest = array_values( array_filter( summary()['attendees']->{14}, static function ( $row ) use ( $pending_rejection ) { return $row['id'] === $pending_rejection['id']; } ) )[0];
check( 'rejected' === $rejected_roster_guest['status'], 'Roster includes rejected guest status' );
$GLOBALS['test_user'] = 1;
$pending_export_guest = fenix_add_event_guest( request( array( 'id' => $approval_signup, 'name' => 'Pending Export Guest', 'email' => 'pending-export@example.com' ) ) )->get_data();
$GLOBALS['test_users'][4] = (object) array( 'ID' => 4, 'display_name' => 'Charlie Person', 'user_email' => 'charlie@example.com' );
$GLOBALS['test_user_meta'][1] = array( 'company' => 'Alice Co', 'expertise' => 'Digital marketing', 'specific_search' => 'Web developers', 'deputy' => 'Bob Backup' );
$GLOBALS['test_user_meta'][4] = array( 'company' => 'Person AB' );
$directory = fenix_get_member_directory_export()->get_data();
$alice_index = null;
foreach ( $directory as $index => $row ) {
	if ( 'member' === $row['type'] && 'Alice' === $row['name'] ) {
		$alice_index = $index;
		break;
	}
}
check( null !== $alice_index && 'Alice Co' === $directory[ $alice_index ]['company'], 'Directory returns member profile fields' );
check( 'Digital marketing' === $directory[ $alice_index ]['expertise'] && 'Web developers' === $directory[ $alice_index ]['specific_search'], 'Directory includes expertise and specific search' );
check( 'Bob Backup' === $directory[ $alice_index ]['deputy'] && '' === $directory[ $alice_index + 1 ]['deputy'], 'Directory includes deputy' );
$alice_guests = array();
for ( $index = $alice_index + 1; $index < count( $directory ) && 'member' !== $directory[ $index ]['type']; ++$index ) {
	$alice_guests[] = $directory[ $index ];
}
$approved_export = array_values( array_filter( $alice_guests, static function ( $row ) { return 'Approved Guest' === $row['guest_name']; } ) );
check( 1 === count( $approved_export ) && 'approved@example.com' === $approved_export[0]['guest_email'], 'Directory groups active guests after inviter' );
$rejected_export = array_values( array_filter( $alice_guests, static function ( $row ) { return 'Rejected Guest' === $row['guest_name']; } ) );
check( 1 === count( $rejected_export ) && 'rejected' === $rejected_export[0]['status'], 'Directory includes rejected guests with their status' );
$pending_export = array_values( array_filter( $alice_guests, static function ( $row ) { return 'Pending Export Guest' === $row['guest_name']; } ) );
check( 1 === count( $pending_export ) && 'pending' === $pending_export[0]['status'] && $pending_export_guest['id'] === $pending_export[0]['id'], 'Directory includes pending guests with their status' );
$cancelled_export = array_values( array_filter( $alice_guests, static function ( $row ) { return 'Guest Two' === $row['guest_name']; } ) );
check( 1 === count( $cancelled_export ) && $cancelled_export[0]['signup_cancelled'], 'Directory includes guests from cancelled signups' );
check( 1 === $directory[ $alice_index ]['user_id'] && $approved_export[0]['id'] === $pending_approval['id'], 'Directory includes stable identifiers for grouped cards' );
check( 'Charlie Person' === $directory[ count( $directory ) - 1 ]['name'], 'Member without guests still appears in the directory' );
echo "Event signup simulation passed.\n";
