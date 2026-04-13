'use client';

/**
 * UTM Builder Component
 * Helps users create UTM-tagged URLs for their campaigns.
 */

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';

interface UTMParams {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

const MEDIUM_SUGGESTIONS = [
  'cpc',
  'paid_social',
  'email',
  'organic_social',
  'referral',
  'display',
  'affiliate',
];

const SOURCE_SUGGESTIONS = [
  'google',
  'linkedin',
  'facebook',
  'instagram',
  'twitter',
  'newsletter',
  'bing',
];

export function UTMBuilder() {
  const [params, setParams] = useState<UTMParams>({
    url: '',
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
  });
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(() => {
    if (!params.url) return '';

    try {
      // Validate URL
      let baseUrl = params.url.trim();
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
      }

      const url = new URL(baseUrl);

      // Add UTM parameters
      if (params.source) url.searchParams.set('utm_source', params.source.trim());
      if (params.medium) url.searchParams.set('utm_medium', params.medium.trim());
      if (params.campaign) url.searchParams.set('utm_campaign', params.campaign.trim());
      if (params.term) url.searchParams.set('utm_term', params.term.trim());
      if (params.content) url.searchParams.set('utm_content', params.content.trim());

      return url.toString();
    } catch {
      return '';
    }
  }, [params]);

  const handleCopy = async () => {
    if (!generatedUrl) return;

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const updateParam = (key: keyof UTMParams, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = params.url && params.source && params.medium && params.campaign;

  return (
    <Card>
      <CardHeader>
        <CardTitle>UTM Builder</CardTitle>
        <p className="text-sm text-slate-500">
          Lag sporbare lenker for dine kampanjer
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Nettside-URL <span className="text-red-400">*</span>
          </label>
          <Input
            type="text"
            placeholder="https://dinside.no/landing-page"
            value={params.url}
            onChange={(e) => updateParam('url', e.target.value)}
          />
        </div>

        {/* Source & Medium Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Kilde (utm_source) <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="google, linkedin, facebook..."
              value={params.source}
              onChange={(e) => updateParam('source', e.target.value)}
              list="source-suggestions"
            />
            <datalist id="source-suggestions">
              {SOURCE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500 mt-1">Hvor trafikken kommer fra</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Medium (utm_medium) <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              placeholder="cpc, paid_social, email..."
              value={params.medium}
              onChange={(e) => updateParam('medium', e.target.value)}
              list="medium-suggestions"
            />
            <datalist id="medium-suggestions">
              {MEDIUM_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="text-xs text-slate-500 mt-1">Type markedsføring</p>
          </div>
        </div>

        {/* Campaign */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Kampanje (utm_campaign) <span className="text-red-400">*</span>
          </label>
          <Input
            type="text"
            placeholder="spring_sale, product_launch, webinar_2026..."
            value={params.campaign}
            onChange={(e) => updateParam('campaign', e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">Navn på kampanjen</p>
        </div>

        {/* Optional: Term & Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Søkeord (utm_term) <span className="text-slate-500 font-normal">- valgfritt</span>
            </label>
            <Input
              type="text"
              placeholder="analytics software..."
              value={params.term}
              onChange={(e) => updateParam('term', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">For betalte søkekampanjer</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Innhold (utm_content) <span className="text-slate-500 font-normal">- valgfritt</span>
            </label>
            <Input
              type="text"
              placeholder="blue_button, hero_video..."
              value={params.content}
              onChange={(e) => updateParam('content', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">For A/B-testing</p>
          </div>
        </div>

        {/* Generated URL */}
        <div className="pt-4 border-t border-slate-800">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Generert URL
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-x-auto">
              <code className="text-sm text-emerald-400 whitespace-nowrap">
                {generatedUrl || 'Fyll inn feltene over...'}
              </code>
            </div>
            <button
              onClick={handleCopy}
              disabled={!isValid}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {copied ? 'Kopiert!' : 'Kopier'}
            </button>
          </div>
          {!isValid && params.url && (
            <p className="text-xs text-amber-400 mt-2">
              Fyll inn kilde, medium og kampanje for å generere URL
            </p>
          )}
        </div>

        {/* Quick Tips */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm font-medium text-slate-300 mb-2">Tips</p>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Bruk lowercase og underscores (f.eks. <code className="text-slate-400">paid_social</code>)</li>
            <li>• Vær konsistent med navngiving på tvers av kampanjer</li>
            <li>• Unngå mellomrom og spesialtegn</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
