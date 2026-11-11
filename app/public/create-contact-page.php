<?php
// WordPress Bootstrap
require_once('wp-load.php');

// Page content
$page_title = 'Kontakt';
$page_content = <<<EOT
<p>Har du några frågor eller behöver komma i kontakt med nätverket, maila:</p>

<p><a href="mailto:affarsnatverketfenix@gmail.com">affarsnatverketfenix@gmail.com</a></p>

<h2>Här träffas vi</h2>

<p>Malmö Arena Hotell – <a href="https://nilssons.se/restaurang-vinbar-malmo/" target="_blank" rel="noopener noreferrer">Nilssons Restaurang &amp; Vinbar</a></p>

<p>Fredagar kl 11.15 – 13.00</p>

<iframe src="https://www.google.com/maps?q=Hyllie+Boulevard+12,+215+32+Malmö&output=embed" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
EOT;

// Check if page already exists
$existing_page = get_page_by_path('kontakt', OBJECT, 'page');
if ($existing_page) {
    echo "Page 'kontakt' already exists. Updating...\n";
    wp_update_post([
        'ID' => $existing_page->ID,
        'post_content' => $page_content,
        'post_title' => $page_title,
    ]);
    echo "✓ Page updated (ID: {$existing_page->ID})\n";
} else {
    // Create new page
    $page_id = wp_insert_post([
        'post_type' => 'page',
        'post_title' => $page_title,
        'post_name' => 'kontakt',
        'post_content' => $page_content,
        'post_status' => 'publish',
        'post_author' => 1,
    ]);
    
    if (is_wp_error($page_id)) {
        echo "Error creating page: " . $page_id->get_error_message() . "\n";
    } else {
        echo "✓ Page created successfully\n";
        echo "  ID: $page_id\n";
        echo "  URL: " . get_permalink($page_id) . "\n";
    }
}
?>
