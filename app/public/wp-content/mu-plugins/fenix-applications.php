<?php
/**
 * Private membership applications and administrator review.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'register_post_type_args', static function ( $args, $post_type ) {
	if ( 'fenix_application' === $post_type ) {
		$args['public']              = false;
		$args['publicly_queryable']  = false;
		$args['exclude_from_search'] = true;
		$args['has_archive']         = false;
		$args['rewrite']             = false;
		$args['show_in_rest']        = false;
		$args['show_ui']             = false;
	}
	return $args;
}, 10, 2 );

add_action( 'rest_api_init', static function () {
	register_rest_route( 'fenix/v1', '/applications', array(
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'fenix_submit_application',
			'permission_callback' => '__return_true',
		),
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'fenix_list_applications',
			'permission_callback' => 'fenix_applications_admin',
		),
	) );
	foreach ( array( 'approve', 'reject', 'notify' ) as $action ) {
		register_rest_route( 'fenix/v1', '/applications/(?P<id>\d+)/' . $action, array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => static function ( $request ) use ( $action ) {
				return fenix_review_application( (int) $request['id'], $action );
			},
			'permission_callback' => 'fenix_applications_admin',
		) );
	}
} );

function fenix_applications_admin() {
	return is_user_logged_in() && current_user_can( 'manage_options' );
}

function fenix_application_error( $code, $message, $status ) {
	return new WP_Error( $code, $message, array( 'status' => $status ) );
}

function fenix_application_fields() {
	return array(
		'fornamn'           => 'Förnamn',
		'efternamn'         => 'Efternamn',
		'e-postadress'      => 'E-postadress',
		'telefonnummer'     => 'Telefonnummer',
		'foretagsnamn'      => 'Företagsnamn',
		'organisationsnummer' => 'Organisationsnummer',
		'roll'              => 'Roll/titel',
		'bransch'           => 'Expertområde/bransch',
		'referenser'        => 'Referenser',
		'samtycke_godkant'  => 'Samtycke',
	);
}

function fenix_application_acf_keys() {
	if ( ! function_exists( 'acf_get_field_groups' ) || ! function_exists( 'acf_get_fields' ) || ! function_exists( 'update_field' ) ) {
		return fenix_application_error( 'fenix_acf_unavailable', 'Ansökningsformuläret är inte tillgängligt. Kontakta oss.', 503 );
	}
	$keys = array();
	foreach ( acf_get_field_groups( array( 'post_type' => 'fenix_application' ) ) as $group ) {
		foreach ( (array) acf_get_fields( $group ) as $field ) {
			if ( isset( $field['name'], $field['key'] ) && array_key_exists( $field['name'], fenix_application_fields() ) ) {
				if ( isset( $keys[ $field['name'] ] ) ) {
					return fenix_application_error( 'fenix_acf_duplicate', 'Ansökningsfälten är felaktigt konfigurerade. Kontakta oss.', 503 );
				}
				$keys[ $field['name'] ] = $field['key'];
			}
		}
	}
	if ( count( $keys ) !== count( fenix_application_fields() ) ) {
		return fenix_application_error( 'fenix_acf_missing', 'Ansökningsfälten är inte färdigkonfigurerade. Kontakta oss.', 503 );
	}
	return $keys;
}

function fenix_application_lock( $name, $callback ) {
	global $wpdb;
	$lock = 'fenix_app_' . md5( $wpdb->prefix . ':' . $name );
	if ( '1' !== (string) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', $lock, 10 ) ) ) {
		return fenix_application_error( 'fenix_application_busy', 'Försök igen om en stund.', 503 );
	}
	try {
		return $callback();
	} finally {
		$wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) );
	}
}

function fenix_submit_application( WP_REST_Request $request ) {
	if ( ! post_type_exists( 'fenix_application' ) ) {
		return fenix_application_error( 'fenix_application_unavailable', 'Ansökningsformuläret är inte tillgängligt. Kontakta oss.', 503 );
	}
	$keys = fenix_application_acf_keys();
	if ( is_wp_error( $keys ) ) {
		return $keys;
	}
	if ( strlen( $request->get_body() ) > 16384 ) {
		return fenix_application_error( 'fenix_application_too_large', 'Ansökan är för stor.', 413 );
	}
	$data = $request->get_json_params();
	if ( ! is_array( $data ) ) {
		return fenix_application_error( 'fenix_invalid_application', 'Kontrollera ansökan och försök igen.', 400 );
	}
	$values = array();
	foreach ( fenix_application_fields() as $name => $label ) {
		if ( 'samtycke_godkant' === $name ) {
			if ( ! isset( $data[ $name ] ) || true !== $data[ $name ] ) {
				return fenix_application_error( 'fenix_application_consent', 'Du måste godkänna villkoren.', 400 );
			}
			$values[ $name ] = 1;
			continue;
		}
		if ( ! isset( $data[ $name ] ) || ! is_string( $data[ $name ] ) ) {
			return fenix_application_error( 'fenix_application_field', sprintf( 'Ange %s.', $label ), 400 );
		}
		$value = 'referenser' === $name ? sanitize_textarea_field( $data[ $name ] ) : sanitize_text_field( $data[ $name ] );
		$limit = 'referenser' === $name ? 1000 : ( in_array( $name, array( 'fornamn', 'efternamn', 'e-postadress' ), true ) ? 100 : 200 );
		$characters = preg_match_all( '/[\s\S]/u', $value );
		$surrogates = preg_match_all( '/[\x{10000}-\x{10FFFF}]/u', $value );
		if ( '' === trim( $value ) || false === $characters || false === $surrogates || $characters + $surrogates > $limit ) {
			return fenix_application_error( 'fenix_application_field', sprintf( 'Kontrollera fältet %s.', $label ), 400 );
		}
		if ( 'e-postadress' === $name && ! is_email( $value ) ) {
			return fenix_application_error( 'fenix_application_email', 'Ange en giltig e-postadress.', 400 );
		}
		$values[ $name ] = $value;
	}
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	if ( '' === $ip ) {
		return fenix_application_error( 'fenix_application_address', 'Ansökan kunde inte skickas. Försök igen senare.', 503 );
	}
	$rate_key = 'fenix_app_rate_' . hash_hmac( 'sha256', $ip, wp_salt( 'nonce' ) );
	return fenix_application_lock( $rate_key, static function () use ( $rate_key, $values, $keys ) {
		$count = (int) get_transient( $rate_key );
		if ( $count >= 5 ) {
			return fenix_application_error( 'fenix_application_rate', 'För många försök. Försök igen senare.', 429 );
		}
		if ( ! set_transient( $rate_key, $count + 1, HOUR_IN_SECONDS ) ) {
			return fenix_application_error( 'fenix_application_rate_unavailable', 'Ansökan kunde inte skickas. Försök igen senare.', 503 );
		}
		$id = wp_insert_post( array(
			'post_type'   => 'fenix_application',
			'post_status' => 'draft',
			'post_title'  => 'Medlemsansökan',
		), true );
		if ( is_wp_error( $id ) || ! $id ) {
			return fenix_application_error( 'fenix_application_save', 'Ansökan kunde inte sparas. Försök igen.', 500 );
		}
		foreach ( $values as $name => $value ) {
			update_field( $keys[ $name ], wp_slash( $value ), $id );
			if ( (string) get_field( $keys[ $name ], $id, false ) !== (string) $value || get_post_meta( $id, '_' . $name, true ) !== $keys[ $name ] ) {
				wp_delete_post( $id, true );
				return fenix_application_error( 'fenix_application_save', 'Ansökan kunde inte sparas. Försök igen.', 500 );
			}
		}
		update_post_meta( $id, '_fenix_consent_at', gmdate( 'c' ) );
		update_post_meta( $id, '_fenix_consent_version', 'application-2026-11' );
		update_post_meta( $id, '_fenix_application_state', 'pending' );
		if ( 'pending' !== get_post_meta( $id, '_fenix_application_state', true ) || ! get_post_meta( $id, '_fenix_consent_at', true ) || ! get_post_meta( $id, '_fenix_consent_version', true ) ) {
			wp_delete_post( $id, true );
			return fenix_application_error( 'fenix_application_save', 'Ansökan kunde inte sparas. Försök igen.', 500 );
		}
		return new WP_REST_Response( array( 'message' => 'Din ansökan har skickats.' ), 201 );
	} );
}

function fenix_application_data( $id ) {
	$values = array();
	foreach ( fenix_application_fields() as $name => $label ) {
		$values[ $name ] = get_field( $name, $id, false );
	}
	return array(
		'id'         => $id,
		'date'       => get_post_field( 'post_date', $id ),
		'state'      => get_post_meta( $id, '_fenix_application_state', true ),
		'mail_state' => get_post_meta( $id, '_fenix_application_mail', true ),
		'account_created' => (bool) get_post_meta( $id, '_fenix_application_user', true ),
		'fields'     => $values,
	);
}

function fenix_list_applications() {
	$keys = fenix_application_acf_keys();
	if ( is_wp_error( $keys ) ) {
		return $keys;
	}
	$ids = get_posts( array(
		'post_type' => 'fenix_application', 'post_status' => 'draft',
		'posts_per_page' => -1, 'fields' => 'ids', 'orderby' => 'date', 'order' => 'DESC',
		'meta_query' => array( array( 'key' => '_fenix_application_state', 'compare' => 'EXISTS' ) ),
	) );
	return rest_ensure_response( array_map( 'fenix_application_data', $ids ) );
}

function fenix_application_set_meta( $id, $key, $value ) {
	update_post_meta( $id, $key, $value );
	return (string) get_post_meta( $id, $key, true ) === (string) $value;
}

function fenix_review_application( $id, $action ) {
	$keys = fenix_application_acf_keys();
	if ( is_wp_error( $keys ) ) {
		return $keys;
	}
	$post = get_post( $id );
	if ( ! $post || 'fenix_application' !== $post->post_type || 'draft' !== $post->post_status ) {
		return fenix_application_error( 'fenix_application_missing', 'Ansökan finns inte.', 404 );
	}
	$email = get_field( 'e-postadress', $id, false );
	if ( ! is_string( $email ) || ! is_email( $email ) ) {
		return fenix_application_error( 'fenix_application_invalid', 'Ansökans e-postadress är ogiltig.', 409 );
	}
	return fenix_application_lock( strtolower( $email ), static function () use ( $id, $action, $email ) {
		clean_post_cache( $id );
		if ( strtolower( (string) get_field( 'e-postadress', $id, false ) ) !== strtolower( $email ) ) {
			return fenix_application_error( 'fenix_application_changed', 'Ansökan har ändrats. Uppdatera listan och försök igen.', 409 );
		}
		$state = get_post_meta( $id, '_fenix_application_state', true );
		if ( 'notify' === $action ) {
			if ( ! in_array( $state, array( 'approved', 'rejected' ), true ) || 'sent' === get_post_meta( $id, '_fenix_application_mail', true ) ) {
				return fenix_application_error( 'fenix_application_state', 'Det finns inget meddelande att skicka.', 409 );
			}
			return fenix_application_notify( $id, $state );
		}
		if ( 'reject' === $action ) {
			$can_reject_provisioning = 'provisioning' === $state &&
				! get_post_meta( $id, '_fenix_application_user', true ) &&
				! username_exists( 'fenix-application-' . $id );
			if ( 'pending' !== $state && ! $can_reject_provisioning ) {
				return fenix_application_error( 'fenix_application_state', 'Ansökan kan inte avvisas i sitt nuvarande läge.', 409 );
			}
			if ( ! fenix_application_set_meta( $id, '_fenix_application_decided_by', get_current_user_id() ) ||
				! fenix_application_set_meta( $id, '_fenix_application_decided_at', gmdate( 'c' ) ) ||
				! fenix_application_set_meta( $id, '_fenix_application_state', 'rejected' ) ) {
				return fenix_application_error( 'fenix_application_save', 'Beslutet kunde inte sparas.', 500 );
			}
			return fenix_application_notify( $id, 'rejected' );
		}
		if ( ! in_array( $state, array( 'pending', 'provisioning' ), true ) ) {
			return fenix_application_error( 'fenix_application_state', 'Ansökan har redan behandlats.', 409 );
		}
		$fields = fenix_application_data( $id )['fields'];
		$user_id = (int) get_post_meta( $id, '_fenix_application_user', true );
		if ( ! $user_id ) {
			if ( email_exists( $fields['e-postadress'] ) ) {
				return fenix_application_error( 'fenix_application_duplicate', 'E-postadressen används redan av ett konto. Kontrollera ansökan manuellt.', 409 );
			}
			$username = 'fenix-application-' . $id;
			if ( username_exists( $username ) ) {
				return fenix_application_error( 'fenix_application_duplicate', 'Ett konto med ansökans användarnamn finns redan. Kontrollera ansökan manuellt.', 409 );
			}
			if ( ! fenix_application_set_meta( $id, '_fenix_application_state', 'provisioning' ) ) {
				return fenix_application_error( 'fenix_application_save', 'Godkännandet kunde inte påbörjas.', 500 );
			}
			$user_id = wp_insert_user( array(
				'user_login'   => $username,
				'user_pass'    => wp_generate_password( 32, true, true ),
				'user_email'   => wp_slash( $fields['e-postadress'] ),
				'first_name'   => wp_slash( $fields['fornamn'] ),
				'last_name'    => wp_slash( $fields['efternamn'] ),
				'display_name' => wp_slash( $fields['fornamn'] . ' ' . $fields['efternamn'] ),
				'role'         => 'subscriber',
			) );
			if ( is_wp_error( $user_id ) || ! $user_id ) {
				return fenix_application_error( 'fenix_application_user', 'Kontot kunde inte skapas. Kontrollera ansökan och försök igen.', 500 );
			}
			if ( ! fenix_application_set_meta( $id, '_fenix_application_user', $user_id ) ) {
				return fenix_application_error( 'fenix_application_user_link', 'Kontot skapades men kunde inte kopplas till ansökan. Kontakta en administratör.', 500 );
			}
		}
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return fenix_application_error( 'fenix_application_user_missing', 'Det kopplade kontot finns inte. Kontrollera ansökan manuellt.', 409 );
		}
		if ( strtolower( $user->user_email ) !== strtolower( $fields['e-postadress'] ) ) {
			return fenix_application_error( 'fenix_application_user_email', 'Kontots e-postadress skiljer sig från ansökan. Kontrollera ansökan manuellt.', 409 );
		}
		foreach ( array( 'company' => 'foretagsnamn', 'phone' => 'telefonnummer', 'role' => 'roll', 'industry' => 'bransch' ) as $meta => $field ) {
			update_user_meta( $user_id, $meta, wp_slash( $fields[ $field ] ) );
			if ( (string) get_user_meta( $user_id, $meta, true ) !== (string) $fields[ $field ] ) {
				return fenix_application_error( 'fenix_application_profile', 'Kontot skapades men profiluppgifter kunde inte sparas. Försök godkänna igen.', 500 );
			}
		}
		if ( ! fenix_application_set_meta( $id, '_fenix_application_decided_by', get_current_user_id() ) ||
			! fenix_application_set_meta( $id, '_fenix_application_decided_at', gmdate( 'c' ) ) ||
			! fenix_application_set_meta( $id, '_fenix_application_state', 'approved' ) ) {
			return fenix_application_error( 'fenix_application_save', 'Kontot skapades men beslutet kunde inte sparas. Försök godkänna igen.', 500 );
		}
		return fenix_application_notify( $id, 'approved' );
	} );
}

function fenix_application_notify( $id, $state ) {
	$fields = fenix_application_data( $id )['fields'];
	if ( 'approved' === $state ) {
		$user = get_userdata( (int) get_post_meta( $id, '_fenix_application_user', true ) );
		if ( ! $user ) {
			return fenix_application_error( 'fenix_application_user_missing', 'Beslutet är sparat men kontot saknas. Kontrollera ansökan manuellt.', 500 );
		}
		if ( strtolower( $user->user_email ) !== strtolower( $fields['e-postadress'] ) ) {
			return fenix_application_error( 'fenix_application_user_email', 'Kontots e-postadress skiljer sig från ansökan. Kontrollera ansökan manuellt.', 409 );
		}
		$key = get_password_reset_key( $user );
		if ( is_wp_error( $key ) ) {
			return fenix_application_error( 'fenix_application_mail', 'Ansökan är godkänd, men lösenordslänken kunde inte skapas. Försök skicka e-post igen.', 500 );
		}
		$url = network_site_url( 'wp-login.php?action=rp&key=' . rawurlencode( $key ) . '&login=' . rawurlencode( $user->user_login ), 'login' );
		$subject = 'Din medlemsansökan har godkänts';
		$message = "Hej {$fields['fornamn']},\n\nDin ansökan till Affärsnätverket Fenix har godkänts. Välj ett lösenord via länken nedan:\n\n{$url}\n\nDitt användarnamn är {$user->user_login}.\n";
	} else {
		$subject = 'Svar på din medlemsansökan';
		$message = "Hej {$fields['fornamn']},\n\nTack för din ansökan till Affärsnätverket Fenix. Vi kan tyvärr inte godkänna din ansökan denna gång.\n";
	}
	if ( ! wp_mail( $fields['e-postadress'], $subject, $message ) ) {
		return fenix_application_error( 'fenix_application_mail', 'Beslutet är sparat, men e-post kunde inte skickas. Försök skicka igen.', 500 );
	}
	if ( ! fenix_application_set_meta( $id, '_fenix_application_mail', 'sent' ) ) {
		return fenix_application_error( 'fenix_application_mail_status', 'E-post skickades men status kunde inte sparas. Kontrollera innan du skickar igen.', 500 );
	}
	return rest_ensure_response( fenix_application_data( $id ) );
}
