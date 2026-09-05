<?php

define( 'ABSPATH', __DIR__ . '/wordpress/' );
define( 'OPACE_CONTENT_INTEGRITY_VERSION', '1.1.11' );
define( 'OPACE_CONTENT_INTEGRITY_DB_VERSION', '1.0.1' );
define( 'OPACE_CONTENT_INTEGRITY_DIR', dirname( __DIR__, 2 ) . '/' );
define( 'OPACE_CONTENT_INTEGRITY_URL', 'http://example.test/wp-content/plugins/opace-ai-content-checker-detector/' );
defined( 'HOUR_IN_SECONDS' ) || define( 'HOUR_IN_SECONDS', 3600 );
defined( 'MINUTE_IN_SECONDS' ) || define( 'MINUTE_IN_SECONDS', 60 );
defined( 'DAY_IN_SECONDS' ) || define( 'DAY_IN_SECONDS', 86400 );

require_once OPACE_CONTENT_INTEGRITY_DIR . 'vendor/autoload.php';

class WP_Error {
	private $code;
	private $message;
	private $data;
	public function __construct( $code = '', $message = '', $data = null ) {
		$this->code    = $code;
		$this->message = $message;
		$this->data    = $data; }
	public function get_error_code() {
		return $this->code; }
	public function get_error_message() {
		return $this->message; }
	public function get_error_data() {
		return $this->data; }
}

class WP_REST_Request implements ArrayAccess {
	private $params;
	private $headers;

	public function __construct( array $params = array(), array $headers = array() ) {
		$this->params  = $params;
		$this->headers = $headers;
	}

	public function get_json_params() {
		return $this->params;
	}

	public function get_header( $name ) {
		return isset( $this->headers[ $name ] ) ? $this->headers[ $name ] : '';
	}

	#[\ReturnTypeWillChange]
	public function offsetExists( $offset ) {
		return isset( $this->params[ $offset ] );
	}

	#[\ReturnTypeWillChange]
	public function offsetGet( $offset ) {
		return isset( $this->params[ $offset ] ) ? $this->params[ $offset ] : null;
	}

	#[\ReturnTypeWillChange]
	public function offsetSet( $offset, $value ) {
		$this->params[ $offset ] = $value;
	}

	#[\ReturnTypeWillChange]
	public function offsetUnset( $offset ) {
		unset( $this->params[ $offset ] );
	}
}

$GLOBALS['oaci_test_options'] = array();
$GLOBALS['oaci_test_transients'] = array();
$GLOBALS['oaci_test_transient_ttl'] = array();
$GLOBALS['oaci_test_http_calls'] = array();
$GLOBALS['oaci_test_http_response'] = null;
$GLOBALS['oaci_test_http_get_response'] = null;
$GLOBALS['oaci_test_logged_in'] = false;
$GLOBALS['oaci_test_capabilities'] = array();
$GLOBALS['oaci_test_posts'] = array();

class WP_Post {
	public $ID;
	public $post_title   = '';
	public $post_content = '';
	public $post_type    = 'post';
	public $post_status  = 'publish';

	public function __construct( array $fields = array() ) {
		foreach ( $fields as $key => $value ) {
			$this->$key = $value;
		}
	}
}

function __( $text ) {
	return $text; }
function is_wp_error( $value ) {
	return $value instanceof WP_Error; }
function get_option( $key, $default = false ) {
	return array_key_exists( $key, $GLOBALS['oaci_test_options'] ) ? $GLOBALS['oaci_test_options'][ $key ] : $default; }
function add_option( $key, $value ) {
	if ( ! array_key_exists( $key, $GLOBALS['oaci_test_options'] ) ) {
		$GLOBALS['oaci_test_options'][ $key ] = $value;
	}
	return true; }
function get_transient( $key ) {
	return array_key_exists( $key, $GLOBALS['oaci_test_transients'] ) ? $GLOBALS['oaci_test_transients'][ $key ] : false; }
function set_transient( $key, $value, $expiration ) {
	$GLOBALS['oaci_test_transients'][ $key ] = $value;
	// How long each answer is kept matters as much as what it says, so the
	// double records it and a test can read it back.
	$GLOBALS['oaci_test_transient_ttl'][ $key ] = $expiration;
	return true; }
/* Enough of the admin URL helpers for the editor configuration to be built and
   read back. None of them touch a network or a database. */
function rest_url( $path = '' ) {
	return 'https://wordpress.example/wp-json/' . ltrim( (string) $path, '/' ); }
function admin_url( $path = '' ) {
	return 'https://wordpress.example/wp-admin/' . ltrim( (string) $path, '/' ); }
function wp_create_nonce( $action ) {
	return 'nonce-' . (string) $action; }
function add_query_arg( $args, $url = '' ) {
	$query = http_build_query( is_array( $args ) ? $args : array() );
	return $url . ( false === strpos( (string) $url, '?' ) ? '?' : '&' ) . $query; }
function wp_nonce_url( $url, $action, $name = '_wpnonce' ) {
	return add_query_arg( array( $name => 'nonce-' . (string) $action ), $url ); }
function apply_filters( $hook, $value ) {
	return $value; }
function delete_transient( $key ) {
	$existed = array_key_exists( $key, $GLOBALS['oaci_test_transients'] );
	unset( $GLOBALS['oaci_test_transients'][ $key ], $GLOBALS['oaci_test_transient_ttl'][ $key ] );
	return $existed; }
function wp_parse_args( $args, $defaults = array() ) {
	return array_merge( $defaults, is_array( $args ) ? $args : array() ); }
function absint( $value ) {
	return abs( (int) $value ); }
function sanitize_key( $value ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function sanitize_text_field( $value ) {
	return trim( strip_tags( (string) $value ) ); }
function esc_url_raw( $value, $protocols = null ) {
	return filter_var( $value, FILTER_SANITIZE_URL ); }
function wp_http_validate_url( $value ) {
	$parts = parse_url( $value );
	return is_array( $parts ) && isset( $parts['scheme'], $parts['host'] ) && 'https' === strtolower( $parts['scheme'] ) && ! in_array( strtolower( $parts['host'] ), array( 'localhost', '127.0.0.1' ), true ) ? $value : false; }
function wp_parse_url( $value ) {
	return parse_url( $value ); }
function untrailingslashit( $value ) {
	return rtrim( $value, '/\\' ); }
function wp_json_encode( $value, $flags = 0 ) {
	return json_encode( $value, $flags ); }
function wp_safe_remote_post( $url, $args ) {
	$GLOBALS['oaci_test_http_calls'][] = array( 'url' => $url, 'args' => $args );
	if ( is_array( $GLOBALS['oaci_test_http_response'] ) && isset( $GLOBALS['oaci_test_http_response'][0] ) ) {
		return array_shift( $GLOBALS['oaci_test_http_response'] );
	}
	return $GLOBALS['oaci_test_http_response']; }
function wp_safe_remote_get( $url, $args ) {
	$GLOBALS['oaci_test_http_calls'][] = array( 'url' => $url, 'args' => $args );
	// A queue when the test needs one answer per attempt, a single value when
	// every attempt should get the same one.
	if ( is_array( $GLOBALS['oaci_test_http_get_response'] ) && isset( $GLOBALS['oaci_test_http_get_response'][0] ) ) {
		return array_shift( $GLOBALS['oaci_test_http_get_response'] );
	}
	return $GLOBALS['oaci_test_http_get_response']; }
function wp_remote_retrieve_response_code( $response ) {
	return isset( $response['response']['code'] ) ? $response['response']['code'] : 0; }
function wp_remote_retrieve_header( $response, $header ) {
	return isset( $response['headers'][ strtolower( $header ) ] ) ? $response['headers'][ strtolower( $header ) ] : ''; }
function wp_remote_retrieve_body( $response ) {
	return isset( $response['body'] ) ? $response['body'] : ''; }
function wp_list_pluck( $list, $field ) {
	return array_map(
		static function ( $item ) use ( $field ) {
			return $item[ $field ];
		},
		$list
	); }
function wp_generate_uuid4() {
	static $i = 1;
	return sprintf( '00000000-0000-4000-8000-%012d', $i++ ); }
function home_url( $path = '' ) {
	return 'https://wordpress.example' . $path; }
function wp_strip_all_tags( $value ) {
	return strip_tags( $value ); }
function strip_shortcodes( $value ) {
	return preg_replace( '/\[\/?[a-z0-9_-]+[^\]]*\]/i', '', (string) $value ); }
function number_format_i18n( $value ) {
	return number_format( (float) $value ); }
function rest_ensure_response( $value ) {
	return $value; }
function get_post( $post_id ) {
	$posts = isset( $GLOBALS['oaci_test_posts'] ) ? $GLOBALS['oaci_test_posts'] : array();
	return isset( $posts[ (int) $post_id ] ) ? $posts[ (int) $post_id ] : null; }
function get_the_title( $post_id ) {
	$post = get_post( $post_id );
	return $post ? $post->post_title : ''; }
function current_time( $type, $gmt = false ) {
	return '2026-08-26 10:00:00'; }
function get_current_user_id() {
	return 7; }
function is_user_logged_in() {
	return $GLOBALS['oaci_test_logged_in']; }
function wp_verify_nonce( $nonce, $action ) {
	return 'valid-rest-nonce' === $nonce && 'wp_rest' === $action; }
function current_user_can( $capability ) {
	return ! empty( $GLOBALS['oaci_test_capabilities'][ $capability ] ); }
