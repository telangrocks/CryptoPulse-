
import { useEffect } from 'react';

interface DocumentHeadOptions {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large-image';
  canonical?: string;
  robots?: string;
  themeColor?: string;
}

export function useDocumentHead(options: DocumentHeadOptions) {
  useEffect(() => {
    const {
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      twitterCard = 'summary_large-image',
      canonical,
      robots = 'index, follow',
      themeColor = '#8b5cf6',
    } = options;

    // Update document title
    if (title) {
      document.title = `${title} | CryptoPulse`;
    }

    // Update meta description
    if (description) {
      updateMetaTag('description', description);
    }

    // Update meta keywords
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }

    // Update Open Graph tags
    if (ogTitle) {
      updateMetaTag('og:title', ogTitle, 'property');
    }

    if (ogDescription) {
      updateMetaTag('og:description', ogDescription, 'property');
    }

    if (ogImage) {
      updateMetaTag('og:image', ogImage, 'property');
    }

    if (ogUrl) {
      updateMetaTag('og:url', ogUrl, 'property');
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:card', twitterCard);
    if (ogTitle) {
      updateMetaTag('twitter:title', ogTitle);
    }
    if (ogDescription) {
      updateMetaTag('twitter:description', ogDescription);
    }
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage);
    }

    // Update canonical URL
    if (canonical) {
      updateLinkTag('canonical', canonical);
    }

    // Update robots meta
    updateMetaTag('robots', robots);
    // Update theme color
    updateMetaTag('theme-color', themeColor);
    // Update viewport for mobile
    updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Cleanup function
    return () => {
      // Reset to default values
      document.title = 'CryptoPulse - AI-Powered Crypto Trading';
      updateMetaTag('description', 'Professional cryptocurrency trading platform with AI-powered signals and automated trading strategies.');
      updateMetaTag('keywords', 'cryptocurrency, trading, AI, bitcoin, ethereum, automated trading, crypto signals');
    };
  }, [options]);
}

function updateMetaTag(name: string, content: string, attribute: string = 'name') {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }

  link.setAttribute('href', href);
}
