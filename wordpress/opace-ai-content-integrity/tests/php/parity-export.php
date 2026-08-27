<?php

require __DIR__ . '/bootstrap.php';

$request = json_decode( file_get_contents( 'php://stdin' ), true );
$request['privacy']['allowed_routes'] = array( 'wordpress_local' );
$result = ( new Opace\ContentIntegrity\Analysis\DeterministicAnalyser() )->analyse( $request );
if ( is_wp_error( $result ) ) {
	fwrite( STDERR, $result->get_error_code() );
	exit( 1 );
}
echo wp_json_encode( $result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
