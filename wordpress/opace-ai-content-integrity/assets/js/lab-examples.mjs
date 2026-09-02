/**
 * Short sample drafts for the "Try an example" tab.
 *
 * Every sample was written for this plugin. None is a real client document and
 * none is quoted from a third party. They exist so an editor can see what a
 * reading looks like before pasting work of their own, so each one is long
 * enough for the model to score (over sixty words) and each is labelled with
 * what it is meant to show. A sample is never evidence about anybody's writing.
 */

const HUMAN = `The boiler went out on the coldest Tuesday of the year, which is how I ended up on the phone to three engineers before nine o'clock. Two could not come until Friday. The third turned up at half past eleven, looked at the pressure gauge, and told me the filling loop had been left open since the last service.

He refilled it, bled two radiators, and charged me forty pounds. I asked whether it would happen again. He said probably, because the loop valve is stiff and people forget. So now there is a note on the airing cupboard door, in biro, telling whoever reads it to close the loop.`;

const RAW_AI = `In today's rapidly evolving digital landscape, content authenticity has become a critical consideration for organisations of all sizes. It's not just about verifying text, it's about building trust with your audience at every touchpoint.

Modern verification tools leverage robust machine learning frameworks to deliver seamless, scalable insights. Moreover, these solutions empower content teams to navigate an increasingly complex ecosystem with confidence. Studies show that organisations prioritising authenticity see significantly improved engagement metrics.

Furthermore, the strategic implementation of such frameworks represents a pivotal moment in the evolution of digital content. In conclusion, the future of content integrity looks bright, and only time will tell how transformative this shift proves to be.`;

const MIXED = `We replaced the old timber sash windows in the front bedroom last autumn, and I have been putting off writing about it because the story is duller than the before-and-after photographs suggest. The joiner turned up on a Tuesday with two apprentices and a van that would not fit down the lane, so the first hour went on carrying frames past the neighbour's car while she watched from the doorstep and said nothing.

The original sashes were not rotten, whatever the surveyor wrote. Two of the four had swollen where the paint had cracked along the bottom rail, and one cord had snapped some time in the nineteen-nineties judging by the newspaper somebody had stuffed into the box to stop the weight rattling. We kept that. It is in a drawer in the kitchen with the other things nobody can throw away.

The joiner reused the original weights because the new ones he had brought were the wrong mass, and the sashes would not sit still without them. He explained this twice, once to me and once to the apprentice who had ordered them, and the second explanation was considerably shorter. The job took a day longer than quoted and cost about the same, which I am told almost never happens.

What surprised me was the glass. We had assumed slim double glazing would look wrong, and in the small upper panes it does, slightly, if you stand close and catch the light. From the pavement you cannot tell. From inside you notice only that the room has stopped making the low whistling noise it used to make in February.

In today's competitive housing market, homeowners are increasingly recognising the value of thoughtful renovation. It's not just about aesthetics, it's about long-term durability and sustainable outcomes that deliver measurable returns over time. Modern fenestration solutions leverage robust engineering principles to provide seamless integration with existing architectural features.

Moreover, careful material selection empowers property owners to navigate an increasingly complex regulatory landscape with confidence. Studies show that properties prioritising heritage-appropriate solutions see significantly improved outcomes across multiple metrics. Furthermore, the strategic implementation of such approaches represents a pivotal moment in the evolution of residential refurbishment.

The transformative potential of considered renovation cannot be overstated. Industry experts agree that a holistic approach to building fabric, encompassing thermal performance, acoustic comfort and visual authenticity, is essential for delivering value in today's demanding environment. In conclusion, the future of period property renovation looks bright, and only time will tell how the sector continues to evolve.

Anyway. The bedroom is warmer now. We have not measured it, and I am slightly suspicious of anybody who claims to have measured this sort of thing in an ordinary house, but the curtains stopped moving on windy nights, which is the test that actually mattered to us.

The bill came to a little under four thousand pounds for four windows, including making good the plaster, which we had not budgeted for and should have. If you are doing this yourself, ask about the plaster. Ask about scaffolding too, because we were told it would not be needed and then on the second morning it was.

One more thing. The joiner asked whether we wanted the sashes to open at the top as well as the bottom, and we said yes without really thinking about it. That turned out to be the best decision of the whole job. In August you can open the top four inches and the room clears in a couple of minutes without the curtains going anywhere. Nobody mentions this in the brochures.`;

const UNICODE = `Our winter maintenance schedule runs from the first week of November to the end of March. The grounds team clears the two main footpaths before seven, salts the car park entrance, and checks the drain covers by the workshop after heavy rain. Anything blocked goes on the log in the porter's office the same morning.

Reports of ice on the sl​ope behind the science block should go to the duty manager, not the general inbox, because the duty ph​one is monitored overnight. The аccess road is gritted by the council and is outside our responsibility, although we still walk it on Monday mornings.

Staff who work late in winter can borrow a torch from reception. Sign it out‮, and back in, on the clipboard.`;

export const LAB_EXAMPLES = Object.freeze([
	Object.freeze({
		id: 'human',
		name: 'Human editorial',
		summary: 'A short piece written by a person, with the uneven rhythm people actually write in.',
		text: HUMAN,
	}),
	Object.freeze({
		id: 'raw-ai',
		name: 'Raw AI draft',
		summary: 'Unedited machine output, stock phrases and all. This is what a strong reading looks like.',
		text: RAW_AI,
	}),
	Object.freeze({
		id: 'mixed',
		name: 'Mixed draft',
		summary: 'Human paragraphs either side of a machine-written middle, to show per-section scoring.',
		text: MIXED,
	}),
	Object.freeze({
		id: 'unicode',
		name: 'Hidden characters',
		summary: 'Ordinary prose carrying invisible characters and a lookalike letter, for the integrity checks.',
		text: UNICODE,
	}),
]);
