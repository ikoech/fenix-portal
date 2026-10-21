<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */
// Allow CORS for React frontend
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'local' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'root' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',          '%,hf5hneb7m0cu*s812.i/0C1(YZCp@;r9C)0T& zVgmIArp8xcvVVP~<-T33_h|' );
define( 'SECURE_AUTH_KEY',   'L9^Q,ElJ/v9^iv9RN$r_#,dzWNiq}l(8)Br4cAT,BF:FkP:5M1b`MGACdI>2!Q_4' );
define( 'LOGGED_IN_KEY',     'RItm;i9*6NSEdf[w]8F^Hq0Y#7V@rev<_<IC~,45Sy`YkaRr*R_xf;.Hi:!f6*DN' );
define( 'NONCE_KEY',         'N;-[8r+i`:eT`+y_4fgWBCpgb`<6WIPlKE&{4 a2.jT_70wDa]`|e!p<gnSE/A{>' );
define( 'AUTH_SALT',         'ibn_x8&]X&e6+*=g8.ZVb-DT8-o_S4*<u=:$e.)AY5dbD+(x7L+xGNeluwD?F@5V' );
define( 'SECURE_AUTH_SALT',  '+o0h#53<wXl,K5#GgeJP5[X>hpMtp^)U$%vb2=p/>9iZJeBfa)6/f-[6=XBOW&>>' );
define( 'LOGGED_IN_SALT',    'qsO>Yb:>drkfMCVQLzZJZ]EbhFaSEtay6;!=O,lEI+> J82 8<q!j1^IU`}|{Jy/' );
define( 'NONCE_SALT',        '$JoG/6:IGW/D1S:/k+}M<LA+cjJkI`1vF@L<9Yu,d>pA}Qv?*GYlU?qZq&N:06@+' );
define( 'WP_CACHE_KEY_SALT', '*[73tur7eQ.yfo?]Tb%,t,ZdpXg}p]>,__Qa(SQ7VA0_#uy+!<OB6}*@pjiZ]LSJ' );


/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/* Add any custom values between this line and the "stop editing" line. */



/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
if ( ! defined( 'WP_DEBUG' ) ) {
	define( 'WP_DEBUG', false );
}

define( 'WP_ENVIRONMENT_TYPE', 'local' );
/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
