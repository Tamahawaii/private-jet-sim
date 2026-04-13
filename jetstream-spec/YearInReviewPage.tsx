// =============================================================================
// YEAR IN REVIEW PRESENTATION
// =============================================================================
// /app/year-in-review/[year]/page.tsx
//
// Spotify-Wrapped style sequential reveal of stats, narrative, awards.

'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import { generateYearInReview } from '@/lib/year-review/generator';
import type { YearInReview } from '@/types';

export default function YearInReviewPage() {
  const params = useParams();
  const year = parseInt(params.year as string);
  const [generating, setGenerating] = useState(false);
  
  const review = useLiveQuery(
    () => db.yearsInReview.get(`year-review-${year}`),
    [year]
  );
  
  useEffect(() => {
    if (!review && !generating) {
      setGenerating(true);
      generateYearInReview(year).finally(() => setGenerating(false));
    }
  }, [review, year, generating]);
  
  if (generating || !review) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-serif italic mb-3">Looking back at {year}…</div>
          <div className="text-xs text-stone-500 uppercase tracking-widest">Generating your year</div>
        </div>
      </div>
    );
  }
  
  return <YearReviewSlideshow review={review} />;
}

// -----------------------------------------------------------------------------
// SLIDESHOW
// -----------------------------------------------------------------------------

const SLIDES = [
  'cover',
  'travel',
  'social', 
  'drama',
  'reputation',
  'collecting',
  'awards',
  'narrative',
  'one-sentence',
] as const;

type SlideKey = typeof SLIDES[number];

function YearReviewSlideshow({ review }: { review: YearInReview }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = SLIDES[slideIndex];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-stone-100 flex flex-col">
      {/* Progress bar */}
      <div className="flex gap-1 p-3">
        {SLIDES.map((_, i) => (
          <div 
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-all ${
              i <= slideIndex ? 'bg-amber-200' : 'bg-stone-700'
            }`}
          />
        ))}
      </div>
      
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {slide === 'cover' && <CoverSlide review={review} />}
          {slide === 'travel' && <TravelSlide review={review} />}
          {slide === 'social' && <SocialSlide review={review} />}
          {slide === 'drama' && <DramaSlide review={review} />}
          {slide === 'reputation' && <ReputationSlide review={review} />}
          {slide === 'collecting' && <CollectingSlide review={review} />}
          {slide === 'awards' && <AwardsSlide review={review} />}
          {slide === 'narrative' && <NarrativeSlide review={review} />}
          {slide === 'one-sentence' && <OneSentenceSlide review={review} />}
        </div>
      </div>
      
      {/* Nav */}
      <div className="p-6 flex justify-between items-center">
        <button
          onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))}
          disabled={slideIndex === 0}
          className="text-stone-500 hover:text-stone-200 disabled:opacity-30"
        >
          ← Previous
        </button>
        <span className="text-xs text-stone-500">{slideIndex + 1} / {SLIDES.length}</span>
        <button
          onClick={() => setSlideIndex(Math.min(SLIDES.length - 1, slideIndex + 1))}
          disabled={slideIndex === SLIDES.length - 1}
          className="text-stone-500 hover:text-stone-200 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SLIDES
// -----------------------------------------------------------------------------

function CoverSlide({ review }: { review: YearInReview }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Year in Review</div>
      <div className="text-8xl font-serif font-light">{review.year}</div>
      <p className="text-stone-300 text-lg italic">"{review.oneSentenceSummary}"</p>
    </div>
  );
}

function TravelSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-8">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">You went places.</h2>
      <div className="grid grid-cols-2 gap-6">
        <Stat number={review.flightCount.toString()} label="flights" />
        <Stat number={review.totalNauticalMiles.toLocaleString()} label="nautical miles" />
        <Stat number={review.uniqueAirports.toString()} label="airports" />
        <Stat number={review.yachtCharters.toString()} label="yacht charters" />
      </div>
      {review.topDestinations.length > 0 && (
        <div className="pt-4 border-t border-stone-800">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Top destinations</p>
          <ul className="space-y-1">
            {review.topDestinations.map((d, i) => (
              <li key={i} className="flex justify-between">
                <span>{d.name}</span>
                <span className="text-stone-500">{d.count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SocialSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-8">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">You collected people.</h2>
      <div className="grid grid-cols-2 gap-6">
        <Stat number={review.newRelationships.length.toString()} label="new connections" />
        <Stat number={review.eventsHosted.toString()} label="events hosted" />
        <Stat number={review.marriagesAttended.toString()} label="weddings" />
        <Stat number={review.divorcesWitnessed.toString()} label="divorces witnessed" />
      </div>
    </div>
  );
}

function DramaSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">There was drama.</h2>
      <div className="text-7xl font-serif">{review.dramaEventCount}</div>
      <p className="text-stone-400">events involving you this year</p>
      <div className="pt-4 border-t border-stone-800 text-left">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">In the press</p>
        <Stat number={review.gossipItemsAboutPlayer.toString()} label="items mentioning you" />
        {review.correctionsIssued > 0 && (
          <p className="text-sm text-stone-400 mt-2">
            You issued {review.correctionsIssued} corrections.
          </p>
        )}
      </div>
    </div>
  );
}

function ReputationSlide({ review }: { review: YearInReview }) {
  const axes: Array<keyof typeof review.reputationEnd> = ['discretion', 'fidelity', 'generosity', 'dramaProne'];
  
  return (
    <div className="space-y-6">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Your reputation shifted.</h2>
      <div className="space-y-4">
        {axes.map(axis => {
          const start = review.reputationStart[axis];
          const end = review.reputationEnd[axis];
          const change = end - start;
          return (
            <div key={axis}>
              <div className="flex justify-between mb-1">
                <span className="capitalize text-sm">{axis}</span>
                <span className="text-sm tabular-nums">
                  {start} → {end} 
                  <span className={change > 0 ? 'text-emerald-400' : change < 0 ? 'text-rose-400' : 'text-stone-500'}>
                    {' '}({change > 0 ? '+' : ''}{change})
                  </span>
                </span>
              </div>
              <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-200" style={{ width: `${end}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {review.publicLabelsEnd.length > 0 && (
        <div className="pt-4 border-t border-stone-800">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">What people say</p>
          <div className="flex flex-wrap gap-2">
            {review.publicLabelsEnd.map(l => (
              <span key={l} className="px-3 py-1 bg-stone-800 rounded-full text-sm italic">"{l}"</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CollectingSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">You acquired beautiful things.</h2>
      <div className="text-7xl font-serif">{review.collectiblesAcquired}</div>
      <p className="text-stone-400">new pieces in the collection</p>
      {review.totalSpentOnArt > 0 && (
        <p className="text-sm text-stone-300 pt-4">
          ${(review.totalSpentOnArt / 1e6).toFixed(1)}M on art alone
        </p>
      )}
    </div>
  );
}

function AwardsSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">The {review.year} awards.</h2>
      {review.awards.length === 0 ? (
        <p className="text-stone-500 italic">No awards this year.</p>
      ) : (
        review.awards.map((a, i) => (
          <div key={i} className="border-l-2 border-amber-200 pl-4 py-2">
            <div className="text-amber-200/90 text-xs uppercase tracking-widest">{a.title}</div>
            <div className="text-lg font-serif">{a.recipient}</div>
            <div className="text-sm text-stone-400 italic">{a.reasoning}</div>
          </div>
        ))
      )}
    </div>
  );
}

function NarrativeSlide({ review }: { review: YearInReview }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200/70">In summary.</h2>
      <div className="text-stone-200 leading-relaxed font-serif text-lg whitespace-pre-line">
        {review.yearNarrative}
      </div>
    </div>
  );
}

function OneSentenceSlide({ review }: { review: YearInReview }) {
  return (
    <div className="text-center space-y-8">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Your year, in a sentence.</div>
      <p className="text-3xl font-serif italic leading-snug">
        "{review.oneSentenceSummary}"
      </p>
      <div className="pt-8">
        <button className="px-6 py-2 bg-amber-200 text-stone-950 rounded-full font-medium hover:bg-amber-100 transition">
          Share
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-serif font-light">{number}</div>
      <div className="text-xs uppercase tracking-widest text-stone-500 mt-1">{label}</div>
    </div>
  );
}
