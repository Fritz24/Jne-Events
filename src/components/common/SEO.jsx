import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'JNE Events';
const SITE_URL = 'https://jneevents.bookontransapp.com';

export default function SEO({
    title,
    description,
    image,
    url,
    type = 'website',
    keywords = []
}) {
    // Homepage and pages without a title: browser tab + Google site name = "JNE Events"
    const documentTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const siteDescription = 'JNE Events offers premium movie nights, music events, and exclusive gatherings. Book your tickets for unforgettable night outs in Cameroon.';
    const actualDescription = description || siteDescription;
    const defaultImage = `${SITE_URL}/picture1.JPG`;
    const actualImage = image || defaultImage;

    const defaultKeywords = [
        'JNE Events', 'Night outs', 'Movie nights', 'Live music', 'Tickets booking',
        'Entertainment', 'Cinema', 'Concerts', 'Parties', 'Exclusive events',
        'Cameroon events', 'Social gatherings', 'Leisure', 'Fun nights'
    ];

    const allKeywords = [...new Set([...defaultKeywords, ...keywords])].join(', ');

    const canonicalUrl = url
        ? (url.startsWith('http') ? url : `${SITE_URL}${url}`)
        : `${SITE_URL}${typeof window !== 'undefined' ? window.location.pathname : '/'}`;

    // og:title = page headline; og:site_name = brand (what Google shows above the URL)
    const ogTitle = title || SITE_NAME;

    return (
        <Helmet>
            <title>{documentTitle}</title>
            <meta name="description" content={actualDescription} />
            <meta name="keywords" content={allKeywords} />
            <meta name="application-name" content={SITE_NAME} />

            <link rel="canonical" href={canonicalUrl} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={ogTitle} />
            <meta property="og:description" content={actualDescription} />
            <meta property="og:image" content={actualImage} />
            <meta property="og:url" content={canonicalUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={ogTitle} />
            <meta name="twitter:description" content={actualDescription} />
            <meta name="twitter:image" content={actualImage} />
        </Helmet>
    );
}
