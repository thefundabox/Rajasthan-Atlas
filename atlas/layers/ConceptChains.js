/**
 * ConceptChains — declarative learning chains rendered as clickable step pills.
 * Each step is a real feature; clicking it selects the feature on the map.
 */

import { Atlas } from '../core/AtlasCore.js';
import { el }    from '../core/util/dom.js';
import { getLang } from '../core/i18n.js';

const pick = (en, hi) => (getLang() === 'hi' && hi != null) ? hi : en;

/**
 * The chain library. Each chain tells a spatial story from climate through
 * soil and vegetation to the flagship protected area(s).
 */
export const CHAINS = [
  {
    id: 'arid-syndrome',
    title: 'The Arid Syndrome',
    title_hi: 'शुष्क सिंड्रोम',
    story: 'How aridity produces the Thar\'s signature landscape',
    story_hi: 'शुष्कता कैसे थार का विशिष्ट भूदृश्य उत्पन्न करती है',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-arid',       label: 'Arid Climate', label_hi: 'शुष्क जलवायु' },
      { layerId: 'rainfall',        featureId: 'rainfall-lt-200',            label: '< 200 mm rainfall', label_hi: '< 200 mm वर्षा' },
      { layerId: 'soil-types',      featureId: 'soil-types-desert',          label: 'Desert soils', label_hi: 'मरुस्थलीय मृदा' },
      { layerId: 'vegetation',      featureId: 'vegetation-thorn-forest',    label: 'Thorn forest', label_hi: 'कँटीला वन' },
      { layerId: 'vegetation',      featureId: 'vegetation-grassland',       label: 'Sewan grasslands', label_hi: 'सेवण घास-मैदान' },
      { layerId: 'national-parks',  featureId: 'desert-np',                  label: 'Desert National Park', label_hi: 'मरु राष्ट्रीय उद्यान' },
    ],
  },
  {
    id: 'aravalli-tiger',
    title: 'The Aravalli Tiger Corridor',
    title_hi: 'अरावली बाघ गलियारा',
    story: 'Semi-arid climate, red-loamy soils, dry-deciduous forest — the fabric of the tiger landscape',
    story_hi: 'अर्ध-शुष्क जलवायु, लाल-दुमटी मृदा, शुष्क-पर्णपाती वन — बाघ भूदृश्य का ताना-बाना',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-semi-arid',  label: 'Semi-arid Climate', label_hi: 'अर्ध-शुष्क जलवायु' },
      { layerId: 'physiography',    featureId: 'physiography-aravalli-hills-region', label: 'Aravalli Hills', label_hi: 'अरावली पहाड़ियाँ' },
      { layerId: 'soil-types',      featureId: 'soil-types-red-loamy',       label: 'Red loamy soils', label_hi: 'लाल दुमटी मृदा' },
      { layerId: 'vegetation',      featureId: 'vegetation-dry-deciduous',   label: 'Dry deciduous forest', label_hi: 'शुष्क पर्णपाती वन' },
      { layerId: 'tiger-reserves',  featureId: 'sariska-tr',                 label: 'Sariska Tiger Reserve', label_hi: 'सरिस्का टाइगर रिज़र्व' },
      { layerId: 'tiger-reserves',  featureId: 'ranthambore-tr',             label: 'Ranthambore Tiger Reserve', label_hi: 'रणथंभौर टाइगर रिज़र्व' },
    ],
  },
  {
    id: 'humid-southeast',
    title: 'The Humid South-East',
    title_hi: 'आर्द्र दक्षिण-पूर्व',
    story: 'Where the monsoon reaches Rajasthan strongest',
    story_hi: 'जहाँ मानसून राजस्थान में सबसे प्रबल पहुँचता है',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-humid-pocket', label: 'Humid pocket', label_hi: 'आर्द्र पॉकेट' },
      { layerId: 'rainfall',        featureId: 'rainfall-gt-1000',           label: '> 1000 mm rainfall', label_hi: '> 1000 mm वर्षा' },
      { layerId: 'physiography',    featureId: 'physiography-southern-hills-region', label: 'Southern hills / Mahi basin', label_hi: 'दक्षिणी पहाड़ियाँ / माही बेसिन' },
      { layerId: 'soil-types',      featureId: 'soil-types-mixed-red-black', label: 'Mixed red-black soils', label_hi: 'मिश्रित लाल-काली मृदा' },
      { layerId: 'vegetation',      featureId: 'vegetation-dry-mixed',       label: 'Dry mixed forest', label_hi: 'शुष्क मिश्रित वन' },
      { layerId: 'wildlife-sanctuaries', featureId: 'sitamata-wls',          label: 'Sitamata WLS', label_hi: 'सीतामाता अभयारण्य' },
      { layerId: 'wildlife-sanctuaries', featureId: 'phulwari-ki-nal-wls',   label: 'Phulwari ki Nal WLS', label_hi: 'फुलवारी की नाल अभयारण्य' },
    ],
  },
  {
    id: 'chambal-network',
    title: 'The Chambal Water Network',
    title_hi: 'चंबल जल नेटवर्क',
    story: 'From the Chambal River to its downstream conservation footprint',
    story_hi: 'चंबल नदी से उसके निचले-प्रवाह संरक्षण-क्षेत्र तक',
    steps: [
      { layerId: 'drainage-basins', featureId: 'drainage-basins-chambal',    label: 'Chambal Basin', label_hi: 'चंबल बेसिन' },
      { layerId: 'rivers',          featureId: 'chambal-river',              label: 'Chambal River', label_hi: 'चंबल नदी' },
      { layerId: 'vegetation',      featureId: 'vegetation-riparian',        label: 'Riparian vegetation', label_hi: 'तटवर्ती वनस्पति' },
      { layerId: 'wildlife-sanctuaries', featureId: 'national-chambal-wls',  label: 'National Chambal WLS', label_hi: 'राष्ट्रीय चंबल अभयारण्य' },
      { layerId: 'tiger-reserves',  featureId: 'mukundra-hills-tr',          label: 'Mukundra Hills TR', label_hi: 'मुकुंदरा हिल्स टाइगर रिज़र्व' },
      { layerId: 'tiger-reserves',  featureId: 'dholpur-karauli-tr',         label: 'Dholpur–Karauli TR', label_hi: 'धौलपुर–करौली टाइगर रिज़र्व' },
    ],
  },
  {
    id: 'wetland-birds',
    title: 'The Ramsar Wetland Story',
    title_hi: 'रामसर आर्द्रभूमि कथा',
    story: 'Rajasthan\'s wetlands — from an inland salt lake to Bharatpur\'s bird paradise',
    story_hi: 'राजस्थान की आर्द्रभूमियाँ — एक अंतःस्थलीय लवण झील से भरतपुर के पक्षी-स्वर्ग तक',
    steps: [
      { layerId: 'drainage-basins', featureId: 'drainage-basins-interior-drainage', label: 'Interior drainage', label_hi: 'आंतरिक अपवाह' },
      { layerId: 'ramsar-sites',    featureId: 'sambhar-ramsar',             label: 'Sambhar Ramsar (1990)', label_hi: 'सांभर रामसर (1990)' },
      { layerId: 'ramsar-sites',    featureId: 'keoladeo-ramsar',            label: 'Keoladeo Ramsar (1981)', label_hi: 'केवलादेव रामसर (1981)' },
      { layerId: 'ramsar-sites',    featureId: 'khichan-ramsar',             label: 'Khichan Ramsar (2025)', label_hi: 'खींचन रामसर (2025)' },
      { layerId: 'ramsar-sites',    featureId: 'menar-ramsar',               label: 'Menar Ramsar (2025)', label_hi: 'मेनार रामसर (2025)' },
      { layerId: 'vegetation',      featureId: 'vegetation-wetland',         label: 'Wetland vegetation', label_hi: 'आर्द्रभूमि वनस्पति' },
    ],
  },
  {
    id: 'hadoti-plateau',
    title: 'The Hadoti Black-Soil Plateau',
    title_hi: 'हाड़ौती काली-मृदा पठार',
    story: 'Vertisols meet the Chambal — how the SE plateau feeds Rajasthan\'s soybean and orange belt',
    story_hi: 'वर्टिसॉल चंबल से मिलती है — कैसे द.पू. पठार राजस्थान की सोयाबीन और संतरा पेटी को पोषित करता है',
    steps: [
      { layerId: 'physiography',    featureId: 'physiography-southeastern-plateau-region', label: 'SE Plateau (Hadoti)', label_hi: 'द.पू. पठार (हाड़ौती)' },
      { layerId: 'soil-types',      featureId: 'soil-types-black',           label: 'Black cotton soils', label_hi: 'काली कपासी मृदा' },
      { layerId: 'agro-climatic-zones', featureId: 'agro-climatic-zones-5',  label: 'Zone V (humid SE)', label_hi: 'ज़ोन V (आर्द्र द.पू.)' },
      { layerId: 'rainfall',        featureId: 'rainfall-700-1000',          label: '700-1000 mm rainfall', label_hi: '700-1000 mm वर्षा' },
      { layerId: 'national-parks',  featureId: 'mukundra-hills-np',          label: 'Mukundra Hills NP', label_hi: 'मुकुंदरा हिल्स राष्ट्रीय उद्यान' },
    ],
  },
  {
    id: 'canal-command',
    title: 'The Canal Command (IGNP)',
    title_hi: 'नहर कमांड (IGNP)',
    story: 'How the Indira Gandhi Canal turned hyper-arid districts into wheat–cotton fields',
    story_hi: 'कैसे इंदिरा गांधी नहर ने अति-शुष्क जिलों को गेहूँ–कपास के खेतों में बदल दिया',
    steps: [
      { layerId: 'climate-regions', featureId: 'climate-regions-arid',       label: 'Arid climate baseline', label_hi: 'शुष्क जलवायु आधार' },
      { layerId: 'agro-climatic-zones', featureId: 'agro-climatic-zones-1b', label: 'Zone IB (Irrigated NW)', label_hi: 'ज़ोन IB (सिंचित उ.प.)' },
      { layerId: 'drainage-basins', featureId: 'drainage-basins-ghaggar',    label: 'Ghaggar basin', label_hi: 'घग्घर बेसिन' },
      { layerId: 'desertification', featureId: 'desertification-moderate',   label: 'Moderate desertification', label_hi: 'मध्यम मरुस्थलीकरण' },
    ],
  },
];

/**
 * Render the chain library as scrollable card set. Used by RevisionDashboard.
 */
export function renderConceptChains() {
  const wrap = el('div', { class: 'concept-chains' });
  for (const chain of CHAINS) {
    const card = el('div', { class: 'chain-card' });
    card.append(el('h3', { class: 'chain-title' }, [pick(chain.title, chain.title_hi)]));
    card.append(el('p',   { class: 'chain-story' }, [pick(chain.story, chain.story_hi)]));
    const steps = el('div', { class: 'chain-steps' });
    chain.steps.forEach((s, i) => {
      if (i > 0) steps.append(el('span', { class: 'chain-arrow' }, ['→']));
      const stepLabel = pick(s.label, s.label_hi);
      const btn = el('button', {
        class: `chain-step chip-${s.layerId}`,
        title: stepLabel,
        onclick: () => {
          Atlas.interaction.select(s.layerId, s.featureId);
          document.querySelector('.revision-overlay')?.classList.remove('open');
        },
      }, [stepLabel]);
      steps.append(btn);
    });
    card.append(steps);
    wrap.append(card);
  }
  return wrap;
}
