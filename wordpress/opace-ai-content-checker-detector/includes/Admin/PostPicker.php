<?php

namespace Opace\ContentIntegrity\Admin;

use WP_Error;
use WP_Query;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/** Read-only discovery of saved writing the current person can edit. */
final class PostPicker {

	public function register_routes() {
		register_rest_route(
			'oaci/v1',
			'/posts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'search' ),
				'permission_callback' => array( $this, 'can_search' ),
				'args'                => array(
					'search' => array(
						'type'              => 'string',
						'default'           => '',
						'maxLength'         => 100,
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => 'rest_validate_request_arg',
					),
					'type'   => array(
						'type'              => 'string',
						'default'           => 'all',
						'enum'              => array( 'all', 'post', 'page' ),
						'validate_callback' => 'rest_validate_request_arg',
					),
					'page'   => array(
						'type'              => 'integer',
						'default'           => 1,
						'minimum'           => 1,
						'maximum'           => 1000,
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
			)
		);
	}

	public function can_search( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() || ! wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
			return new WP_Error( 'permission_denied', __( 'Refresh the page and try again.', 'opace-ai-content-checker-detector' ), array( 'status' => 403 ) );
		}
		return current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' );
	}

	public function search( WP_REST_Request $request ) {
		$types = array();
		foreach ( array( 'post', 'page' ) as $type ) {
			$object = get_post_type_object( $type );
			if ( ( 'all' === $request['type'] || $type === $request['type'] ) && current_user_can( $object->cap->edit_posts ) ) {
				$types[] = $type;
			}
		}
		if ( ! $types ) {
			return rest_ensure_response(
				array(
					'items'    => array(),
					'has_more' => false,
				)
			);
		}
		$args = array(
			'post_type'              => $types,
			'post_status'            => array( 'publish', 'draft', 'pending', 'private', 'future' ),
			's'                      => $request['search'],
			'posts_per_page'         => 10,
			'paged'                  => $request['page'],
			'orderby'                => array(
				'modified' => 'DESC',
				'ID'       => 'DESC',
			),
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		);
		// Narrow authors before pagination for ordinary contributors/authors.
		$can_edit_others = false;
		foreach ( $types as $type ) {
			$object          = get_post_type_object( $type );
			$can_edit_others = $can_edit_others || current_user_can( $object->cap->edit_others_posts );
		}
		if ( ! $can_edit_others ) {
			$args['author'] = get_current_user_id();
		}
		$query = new WP_Query( $args );
		$items = array();
		foreach ( $query->posts as $post ) {
			if ( ! current_user_can( 'edit_post', $post->ID ) ) {
				continue;
			}
			$status  = get_post_status_object( $post->post_status );
			$object  = get_post_type_object( $post->post_type );
			$items[] = array(
				'id'     => $post->ID,
				'title'  => html_entity_decode( wp_strip_all_tags( $post->post_title ), ENT_QUOTES, 'UTF-8' ),
				'type'   => $object->labels->singular_name,
				'status' => $status ? $status->label : $post->post_status,
			);
		}
		$response = rest_ensure_response(
			array(
				'items'    => $items,
				'has_more' => $query->max_num_pages > $request['page'],
			)
		);
		$response->header( 'Cache-Control', 'no-store, private' );
		return $response;
	}
}
