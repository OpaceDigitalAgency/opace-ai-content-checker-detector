<?php

namespace Opace\ContentIntegrity\Adapters;

defined( 'ABSPATH' ) || exit;

final class AdapterRegistry {
	private $adapters = array();

	public function register( GenerationAdapter $adapter ) {
		$this->adapters[ $adapter->id() ] = $adapter;
	}

	public function get( $id ) {
		return isset( $this->adapters[ $id ] ) ? $this->adapters[ $id ] : null;
	}

	public function capabilities() {
		$result = array();
		foreach ( $this->adapters as $adapter ) {
			$result[] = $adapter->capabilities();
		}
		return $result;
	}
}
