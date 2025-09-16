import React from 'react';

/**
 * Generic JSON-LD injector component.
 * Usage: <JsonLd data={{"@context":"https://schema.org", ...}} />
 */
export const JsonLd: React.FC<{ data: Record<string, any> | Record<string, any>[] }>=({ data }) => {
  const json = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json.length === 1 ? json[0] : json) }}
    />
  );
};

export default JsonLd;