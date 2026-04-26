import { Helmet } from 'react-helmet-async';

export default function SEO({
    title,
    description,
    image,
    url,
    type = 'website',
    keywords = []
}) {
    const siteTitle = "JNE Events - Premium Event Management";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const siteDescription = "JNE Events offers premium movie nights, music events, and exclusive gatherings. Book your tickets now for the ultimate night out experiences.";
    const actualDescription = description || siteDescription;
    const defaultImage = "https://jneevents.bookontransapp.com/picture1.JPG";
    const actualImage = image || defaultImage;

    // Default keywords + mission related synonyms
    const defaultKeywords = [
        "JNE Events", "Night outs", "Movie nights", "Live music", "Tickets booking",
        "Entertainment", "Cinema", "Concerts", "Parties", "Exclusive events",
        "Cameroon events", "Social gatherings", "Leisure", "Fun nights"
    ];

    const allKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

    const baseUrl = "https://jneevents.bookontransapp.com";
    const canonicalUrl = url ? (url.startsWith('http') ? url : `${baseUrl}${url}`) : `${baseUrl}${window.location.pathname}`;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={actualDescription} />
            <meta name="keywords" content={allKeywords} />

            {/* Canonical URL - Vital for preventing Vercel URL indexing */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={actualDescription} />
            <meta property="og:image" content={actualImage} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content="JNE Events" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={actualDescription} />
            <meta name="twitter:image" content={actualImage} />
        </Helmet>
    );
}
