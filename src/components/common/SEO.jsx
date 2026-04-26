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

    // Default keywords + mission related synonyms
    const defaultKeywords = [
        "JNE Events", "Night outs", "Movie nights", "Live music", "Tickets booking",
        "Entertainment", "Cinema", "Concerts", "Parties", "Exclusive events",
        "Cameroon events", "Social gatherings", "Leisure", "Fun nights"
    ];

    const allKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={actualDescription} />
            <meta name="keywords" content={allKeywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={actualDescription} />
            {image && <meta property="og:image" content={image} />}
            {url && <meta property="og:url" content={url} />}
            <meta property="og:site_name" content="JNE Events" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={actualDescription} />
            {image && <meta name="twitter:image" content={image} />}

            {/* Canonical URL */}
            {url && <link rel="canonical" href={url} />}
        </Helmet>
    );
}
