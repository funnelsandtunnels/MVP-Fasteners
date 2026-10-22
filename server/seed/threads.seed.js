// Sample inbound email threads. Seeded as raw/unclassified so the LLM pipeline
// classifies + processes them (live) on first server boot when a key is present.

export const sampleThreads = [
  {
    customer_name: 'Dwyer Mechanical',
    customer_email: 'purchasing@dwyermech.com',
    subject: 'RFQ — hex bolts, nuts & washers for skid job',
    body: `Hi,

Please quote the following for our skid fabrication job. Need delivery in 2 weeks.

- 500 ea 1/2-13 x 2 hex cap screws, grade 8
- 500 ea 1/2-13 finished hex nuts
- 1,000 ea 1/2 flat washers, zinc
- 250 ea 3/8-16 x 1-1/2 hex cap screws grade 5

Let me know pricing and lead time.

Thanks,
Rick Dwyer
Purchasing, Dwyer Mechanical`,
  },
  {
    customer_name: 'Coastal Steel Erectors',
    customer_email: 'estimating@coastalsteel.com',
    subject: 'Quote request A325 structural + threaded rod',
    body: `Team,

We have a structural package coming up. Can you price:

  5 boxes  5/8-11 x 2 A325 structural bolts (HDG)
  40 ea    1/2-13 threaded rod, 3ft
  300 ea   5/8 flat washers

Also — do you carry a beam clamp for 1/2" rod? Not sure of the exact part.

Appreciate it,
Maria — Coastal Steel`,
  },
  {
    customer_name: 'Northgate Facilities',
    customer_email: 'jose@northgatefm.com',
    subject: 'Question about deck screw coatings',
    body: `Hey,

Quick question before I order — for an exterior pergola near the coast, would you
recommend your yellow zinc deck screws or something with a better exterior coating?
Not looking for a quote yet, just want to make sure I pick the right product.

Thanks,
Jose`,
  },
  {
    customer_name: 'Perez Welding',
    customer_email: 'shop@perezwelding.com',
    subject: 'RFQ nyloc nuts + concrete anchors',
    body: `Need a quote:

- 1000 pcs 3/8-16 nylon insert lock nuts, zinc
- 100 pcs 1/2 x 4-1/4 wedge anchors
- 6 pcs 3/4-10 x 2-1/2 hex bolt grade 8

Rush if possible.

- Tony Perez`,
  },
];

export default sampleThreads;
