<?php

namespace Opace\ContentIntegrity\Core;

defined( 'ABSPATH' ) || exit;

final class Settings {
	const OPTION            = 'oaci_settings';
	const INSTALL_ID_OPTION = 'oaci_install_id';

	public static function defaults() {
		return array(
			'editor_sidebar'          => true,
			'classic_meta_box'        => true,
			'max_chars'               => 100000,
			'server_analysis_opt_in'  => false,
			'delete_data_uninstall'   => false,
			'include_receipt_content' => false,
			'event_log'               => false,
		);
	}

	public static function seed_defaults() {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, self::defaults(), '', false );
		}
	}

	public static function get() {
		$value = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $value ) ? $value : array(), self::defaults() );
	}

	public static function sanitise( $input ) {
		$input = is_array( $input ) ? $input : array();
		return array(
			'editor_sidebar'          => ! empty( $input['editor_sidebar'] ),
			'classic_meta_box'        => ! empty( $input['classic_meta_box'] ),
			'max_chars'               => max( 10000, min( 100000, absint( isset( $input['max_chars'] ) ? $input['max_chars'] : 100000 ) ) ),
			'server_analysis_opt_in'  => ! empty( $input['server_analysis_opt_in'] ),
			'delete_data_uninstall'   => ! empty( $input['delete_data_uninstall'] ),
			'include_receipt_content' => false,
			'event_log'               => false,
		);
	}

	public static function install_id() {
		$value = (string) get_option( self::INSTALL_ID_OPTION, '' );
		if ( preg_match( '/^wp_[A-Za-z0-9_-]{16,64}$/', $value ) ) {
			return $value;
		}
		$value = 'wp_' . bin2hex( random_bytes( 12 ) );
		add_option( self::INSTALL_ID_OPTION, $value, '', false );
		$stored = (string) get_option( self::INSTALL_ID_OPTION, $value );
		return preg_match( '/^wp_[A-Za-z0-9_-]{16,64}$/', $stored ) ? $stored : $value;
	}
}
