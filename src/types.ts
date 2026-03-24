export interface LeatherMatch {
  label: string;
  confidence: number;
  description?: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  matches: LeatherMatch[];
}

export const LEATHER_CATEGORIES = 203;
export const AVG_PRECISION = 99.2;

export const MOCK_SCANS: ScanResult[] = [
  {
    id: '1',
    timestamp: Date.now() - 3600000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe27DtWBkY1Sf4mC0no5xmvlJ452Gnlq87ilPOIctIHBc3B8PfP2laHmBJ8lpacGSK9JcyqTgMLZy-yY6pZEv-WQnfahNs2DFEojHlCVfosM1dejDaBCd2Um87cCPo8obnmiJNN8Lv6w88vgoIy0GSZ1rXp3pCLkDWsMobRXHAM8DNXBJsfXCAOYX_9rXd9DidsvaBNoToS1LSm9YP69fzuPKlx_kFangEUD-g08EVut8d14OTJNlReyDbZp1v0krv-LwSaS_75Qs',
    matches: [
      { label: 'Full Grain Cowhide', confidence: 98.5 },
      { label: 'Top Grain Cowhide', confidence: 1.2 },
      { label: 'Corrected Grain', confidence: 0.3 }
    ]
  },
  {
    id: '2',
    timestamp: Date.now() - 7200000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADJddMDUFy3UhGXbPKVObpGZS0Ly1dmsjKL3YhFzX3__a2RHg_cSzeXP6f-FWwdUF_L6-p6fQc-2D-kHHfW35D6npWuHVntsPGlMm6-CETiDhH8-aZ6Yg1uR5pZ89FQx_cuxoK9pLxlJpeyCz0vbQ_nadsoeey5ujIA7DX43VThfK-3SHNfExVQ1F0dwem9ZiGNUxv3DMFmp6f56FEqEbZdcGo6_432oXnRvBh-NMX3QWGTNYJgY5kxpAnsrm_wH8lrDS7mPitxWA',
    matches: [
      { label: 'Aniline Suede', confidence: 94.2 },
      { label: 'Nubuck', confidence: 4.5 },
      { label: 'Split Suede', confidence: 1.3 }
    ]
  },
  {
    id: '3',
    timestamp: Date.now() - 86400000,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADyxdIyXhZuWvRMHRo1iTl8zcpjNTIDpAXnXETsBuEGLg1FQ0vhGFHLiRh5DbuApfta_d1eSpJSGKXqo1xVkNNt33RrQQWKI_fMX7TGigF48xwzjdUlj5qtLkN5YbTE2ICvQmc2sF0vOvw4an7M8fPKMqbNF_rGezpU7zEWF1NZ9Qaxt_HiWHGK0jdbYde3lq1MgdmxCSv5p0Vqlb9oQAb2RxgPNt3TnR7jim79Lyix-Nr8PXloW-PS8LUrJ4Tq2eNTl8JBXT1w9E',
    matches: [
      { label: 'Top Grain Pebbled', confidence: 89.1 },
      { label: 'Embossed Leather', confidence: 8.4 },
      { label: 'Pigment Finished', confidence: 2.5 }
    ]
  }
];
