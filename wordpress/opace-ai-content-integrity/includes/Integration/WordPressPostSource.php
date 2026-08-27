<?php

namespace Opace\ContentIntegrity\Integration;

use Opace\ContentIntegrity\Contracts\SourceAdapter;
use WP_Error;

defined( 'ABSPATH' ) || exit;

final class WordPressPostSource implements SourceAdapter {
	public function id() {
		return 'wordpress-post';
	}

	public function can_read( $source_ref, $actor_id ) {
		$post_id = $this->post_id( $source_ref );
		return $post_id > 0 && user_can( $actor_id, 'edit_post', $post_id );
	}

	public function get_content( $source_ref, array $working_copy = array() ) {
		$post_id = $this->post_id( $source_ref );
		if ( ! $this->can_read( $source_ref, get_current_user_id() ) ) {
			return new WP_Error( 'object_not_found', __( 'The source was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
		}
		if ( isset( $working_copy['content'] ) && is_string( $working_copy['content'] ) ) {
			return $working_copy['content'];
		}
		$post = get_post( $post_id );
		return $post ? (string) $post->post_content : new WP_Error( 'object_not_found', __( 'The source was not found.', 'opace-ai-content-integrity' ), array( 'status' => 404 ) );
	}

	public function content_hash( $content ) {
		return 'sha256:' . hash( 'sha256', $content );
	}

	public function label( $source_ref ) {
		$post_id = $this->post_id( $source_ref );
		return $this->can_read( $source_ref, get_current_user_id() ) ? get_the_title( $post_id ) : '';
	}

	public function url( $source_ref ) {
		$post_id = $this->post_id( $source_ref );
		return $this->can_read( $source_ref, get_current_user_id() ) ? get_edit_post_link( $post_id, 'raw' ) : '';
	}

	public function search( $term, $limit = 20 ) {
		$query = new \WP_Query(
			array(
				's'              => sanitize_text_field( $term ),
				'post_type'      => get_post_types( array( 'show_ui' => true ) ),
				'post_status'    => array( 'draft', 'pending', 'private', 'publish' ),
				'posts_per_page' => max( 1, min( 20, absint( $limit ) ) ),
				'no_found_rows'  => true,
			)
		);
		$items = array();
		foreach ( $query->posts as $post ) {
			if ( current_user_can( 'edit_post', $post->ID ) ) {
				$items[] = array(
					'id'     => $post->ID,
					'label'  => get_the_title( $post ),
					'status' => get_post_status( $post ),
				);
			}
		}
		return $items;
	}

	private function post_id( $source_ref ) {
		if ( is_numeric( $source_ref ) ) {
			return absint( $source_ref );
		}
		if ( is_string( $source_ref ) && preg_match( '/^post:(\d+)$/', $source_ref, $match ) ) {
			return absint( $match[1] );
		}
		return 0;
	}
}
