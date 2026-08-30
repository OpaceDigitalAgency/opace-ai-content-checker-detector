<?php

define( 'ABSPATH', __DIR__ . '/wordpress/' );
define( 'OPACE_CONTENT_INTEGRITY_VERSION', '1.0.6' );
define( 'OPACE_CONTENT_INTEGRITY_DB_VERSION', '1.0.1' );
define( 'OPACE_CONTENT_INTEGRITY_DIR', dirname( __DIR__, 2 ) . '/' );
define( 'OPACE_CONTENT_INTEGRITY_URL', 'http://example.test/wp-content/plugins/opace-ai-content-integrity/' );

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

$GLOBALS['oaci_test_options'] = array();

function __( $text ) {
	return $text; }
function is_wp_error( $value ) {
	return $value instanceof WP_Error; }
function get_option( $key, $default = false ) {
	return array_key_exists( $key, $GLOBALS['oaci_test_options'] ) ? $GLOBALS['oaci_test_options'][ $key ] : $default; }
function wp_parse_args( $args, $defaults = array() ) {
	return array_merge( $defaults, is_array( $args ) ? $args : array() ); }
function absint( $value ) {
	return abs( (int) $value ); }
function sanitize_key( $value ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function sanitize_text_field( $value ) {
	return trim( strip_tags( (string) $value ) ); }
function wp_json_encode( $value, $flags = 0 ) {
	return json_encode( $value, $flags ); }
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
function wp_strip_all_tags( $value ) {
	return strip_tags( $value ); }
function current_time( $type, $gmt = false ) {
	return '2026-08-26 10:00:00'; }
function get_current_user_id() {
	return 7; }
