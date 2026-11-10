<?php
// Isolated profile endpoint simulation; no WordPress data is modified.
define( 'ABSPATH', __DIR__ );
$GLOBALS['profile_meta'] = array();
$GLOBALS['profile_fail_key'] = '';
$GLOBALS['profile_user_updates'] = 0;
$GLOBALS['profile_user'] = (object) array(
	'ID'           => 1,
	'display_name' => 'Member',
	'user_email'   => 'member@example.com',
	'roles'        => array( 'subscriber' ),
);
class WP_REST_Request extends ArrayObject {
	private $json;
	public function __construct( $json ) {
		parent::__construct( array( 'id' => 1 ) );
		$this->json = $json;
	}
	public function get_json_params() { return $this->json; }
}
class WP_Error {
	public $code;
	public $data;
	public function __construct( $code, $message, $data ) { $this->code = $code; $this->data = $data; }
}
function add_action( ...$args ) {}
function add_filter( ...$args ) {}
function absint( $value ) { return abs( (int) $value ); }
function get_userdata( $id ) { return 1 === $id ? $GLOBALS['profile_user'] : false; }
function get_user_meta( $id, $key, $single ) { return isset( $GLOBALS['profile_meta'][ $key ] ) ? $GLOBALS['profile_meta'][ $key ] : ''; }
function update_user_meta( $id, $key, $value ) {
	if ( $key === $GLOBALS['profile_fail_key'] ) { return false; }
	$GLOBALS['profile_meta'][ $key ] = stripslashes( $value );
	return true;
}
function wp_slash( $value ) { return addslashes( $value ); }
function sanitize_text_field( $value ) { return trim( preg_replace( '/[\r\n\t]+/', ' ', strip_tags( $value ) ) ); }
function sanitize_textarea_field( $value ) { return trim( strip_tags( $value ) ); }
function sanitize_email( $value ) { return filter_var( $value, FILTER_SANITIZE_EMAIL ); }
function is_email( $value ) { return filter_var( $value, FILTER_VALIDATE_EMAIL ); }
function esc_url_raw( $value ) { return $value; }
function wp_update_user( $update ) { ++$GLOBALS['profile_user_updates']; return $update['ID']; }
function is_wp_error( $value ) { return $value instanceof WP_Error; }
function rest_ensure_response( $value ) { return $value; }

require __DIR__ . '/../app/public/wp-content/mu-plugins/fenix-member-profiles.php';

function check_profile( $condition, $message ) {
	if ( ! $condition ) { throw new RuntimeException( $message ); }
}
function update_profile( $acf, $extra = array() ) {
	return fenix_update_member_profile( new WP_REST_Request( array_merge( $extra, array( 'acf' => $acf ) ) ) );
}

$result = update_profile( array(
	'company'         => ' Example AB ',
	'expertise'       => "Marketing\nStrategy \\ research",
	'specific_search' => "Developers\r\nDesigners",
) );
check_profile( ! is_wp_error( $result ), 'Profile update succeeds' );
check_profile( 'Example AB' === $result['acf']['company'], 'Company persists as user meta' );
check_profile( "Marketing\nStrategy \\ research" === $result['acf']['expertise'], 'Expertise preserves line breaks and backslashes' );
check_profile( "Developers\nDesigners" === $result['acf']['specific_search'], 'Specific search preserves normalized line breaks' );
$reloaded = fenix_get_member_profile_data( 1 );
check_profile( $reloaded['acf']['expertise'] === $result['acf']['expertise'], 'Reloaded profile retains expertise' );
check_profile( $reloaded['acf']['specific_search'] === $result['acf']['specific_search'], 'Reloaded profile retains specific search' );

$result = update_profile( array( 'expertise' => '', 'specific_search' => '' ) );
check_profile( '' === $result['acf']['expertise'] && '' === $result['acf']['specific_search'], 'Optional profile fields can be cleared' );
check_profile( 'Example AB' === $result['acf']['company'], 'Omitted company is preserved' );
check_profile( ! is_wp_error( update_profile( array( 'expertise' => str_repeat( 'å', 1000 ) ) ) ), '1000 multibyte characters are accepted' );
check_profile( ! is_wp_error( update_profile( array( 'specific_search' => str_repeat( '😀', 500 ) ) ) ), '1000 UTF-16 code units are accepted' );
$result = update_profile( array( 'expertise' => str_repeat( '😀', 501 ) ), array( 'name' => 'Changed' ) );
check_profile( is_wp_error( $result ) && 400 === $result->data['status'], 'Text beyond the browser length limit is rejected' );
check_profile( 0 === $GLOBALS['profile_user_updates'], 'Length validation happens before other profile updates' );
$result = update_profile( array( 'specific_search' => str_repeat( 'a', 1001 ) ) );
check_profile( is_wp_error( $result ) && 400 === $result->data['status'], 'Specific search limit is enforced' );
$result = update_profile( array( 'deputy' => ' Bob Backup ' ) );
check_profile( 'Bob Backup' === $result['acf']['deputy'], 'Deputy persists as user meta' );
$result = update_profile( array( 'deputy' => str_repeat( 'a', 201 ) ) );
check_profile( is_wp_error( $result ) && 400 === $result->data['status'], 'Deputy limit is enforced' );
$GLOBALS['profile_fail_key'] = 'expertise';
$result = update_profile( array( 'expertise' => 'New text' ) );
check_profile( is_wp_error( $result ) && 500 === $result->data['status'], 'Metadata write failure is reported' );
echo "Member profile simulation passed.\n";
