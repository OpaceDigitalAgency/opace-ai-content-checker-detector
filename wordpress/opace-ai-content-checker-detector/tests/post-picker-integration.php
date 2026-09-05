<?php
/**
 * Run with wp eval-file on an isolated WordPress test installation.
 * Creates and removes only its own synthetic user and posts.
 */

defined( 'ABSPATH' ) || exit;

require_once ABSPATH . 'wp-admin/includes/user.php';

$created_posts = array();
$created_user  = 0;
$checks        = 0;
$assert        = function ( $condition, $message ) use ( &$checks ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
	++$checks;
};
$request       = function ( $path, $params = array(), $nonce = true ) {
	$request = new WP_REST_Request( 'GET', '/oaci/v1/' . $path );
	$request->set_query_params( $params );
	if ( $nonce ) {
		$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
	}
	return rest_do_request( $request );
};
$original_user = get_current_user_id();
try {
	$created_user = wp_insert_user( array( 'user_login' => 'oaci_picker_qa_' . wp_generate_password( 8, false ), 'user_pass' => wp_generate_password( 32, true ), 'role' => 'contributor' ) );
	$assert( ! is_wp_error( $created_user ), 'Create synthetic contributor' );
	$admin_id = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) )[0];
	$prefix = 'OACI Picker Permissions ' . $created_user;
	foreach ( array( array( $created_user, 'post', 'draft' ), array( $admin_id, 'post', 'private' ), array( $admin_id, 'page', 'draft' ) ) as $fixture ) {
		$created_posts[] = wp_insert_post( array( 'post_author' => $fixture[0], 'post_type' => $fixture[1], 'post_status' => $fixture[2], 'post_title' => $prefix . ' ' . $fixture[1], 'post_content' => 'Synthetic saved content. The picker must never change this original.' ) );
	}
	wp_set_current_user( $created_user );
	$response = $request( 'posts', array( 'search' => $prefix ) );
	$assert( 200 === $response->get_status(), 'Contributor can search' );
	$items = $response->get_data()['items'];
	$assert( array( $created_posts[0] ) === array_column( $items, 'id' ), 'Contributor sees only own editable draft' );
	$assert( ! isset( $items[0]['content'] ), 'Search does not disclose content' );
	$assert( 200 === $request( 'posts/' . $created_posts[0] )->get_status(), 'Contributor can load own saved draft' );
	$assert( 403 === $request( 'posts/' . $created_posts[1] )->get_status(), 'Contributor cannot load another author private post' );
	$assert( 403 === $request( 'posts', array(), false )->get_status(), 'Nonce required' );
	$assert( 400 === $request( 'posts', array( 'search' => str_repeat( 'a', 101 ) ) )->get_status(), 'Overlong search rejected' );
	$assert( 400 === $request( 'posts', array( 'type' => 'attachment' ) )->get_status(), 'Unsupported content type rejected' );
	$assert( 400 === $request( 'posts', array( 'page' => 0 ) )->get_status(), 'Invalid page rejected' );
	wp_set_current_user( $admin_id );
	$items = $request( 'posts', array( 'search' => $prefix ) )->get_data()['items'];
	$assert( 3 === count( $items ), 'Administrator can discover all three editable fixtures' );
	$items = $request( 'posts', array( 'search' => $prefix, 'type' => 'page' ) )->get_data()['items'];
	$assert( array( $created_posts[2] ) === array_column( $items, 'id' ), 'Page filter returns only page' );
	$assert( array() === $request( 'posts', array( 'search' => $prefix . ' impossible' ) )->get_data()['items'], 'No matches returns empty list' );
	$before = get_post( $created_posts[0] )->post_content;
	$request( 'posts/' . $created_posts[0] );
	$assert( $before === get_post( $created_posts[0] )->post_content, 'Loading never changes saved content' );
	wp_set_current_user( 0 );
	$assert( 403 === $request( 'posts', array(), false )->get_status(), 'Anonymous search denied' );
	echo 'Post picker: ' . $checks . " integration checks passed.\n";
} finally {
	wp_set_current_user( $original_user );
	foreach ( $created_posts as $post_id ) {
		wp_delete_post( $post_id, true );
	}
	if ( is_int( $created_user ) && $created_user > 0 ) {
		wp_delete_user( $created_user );
	}
}
