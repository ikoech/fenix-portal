export async function fetchContactPage() {
    // Return hardcoded contact page data
    // (In future, can be moved to WordPress ACF or custom endpoint)
    return {
        contact_intro: 'Har du några frågor eller behöver komma i kontakt med nätverket, maila:',
        contact_email: 'affarsnatverketfenix@gmail.com',
        venue_heading: 'Här träffas vi',
        venue_name: 'Malmö Arena Hotell – Nilssons Restaurang & Vinbar',
        venue_link: 'https://malmoarenahotel.com/mat-och-dryck/nilssons-restaurang-bar/',
        meeting_time: 'Fredagar kl 11.15 – 13.00',
        map_embed: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2168.7894999999998!2d12.9761386!3d55.5656494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4653a12b890d343b%3A0xe52e0f71abef5bed!2sHyllie%20Boulevard%2012%2C%20215%2032%20Malm%C3%B6%2C%20Sweden!5e0!3m2!1sen!2sse!4v1234567890" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    };
}