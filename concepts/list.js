/* The concepts on trial for the hero, in the order the preview turns
   through them. Each names its scene file (scenes/<id>.js), where it is,
   and a line on what the eye sees; the meadow is the picture the site
   has now, kept here to be compared against. */

window.CONCEPT_LIST = [
  {
    id: 'fjord',
    title: 'Fjord',
    place: 'Nærøyfjord, Norway',
    blurb: 'Afloat at dead calm a hand above the water, the walls falling sheer into their own reflection. At night the aurora lights the fjord twice.'
  },
  {
    id: 'dunes',
    title: 'Erg',
    place: 'Sossusvlei, Namibia',
    blurb: 'A low drone pass along the crests of the great red dunes, every ridge a knife edge of light and shade. At night the Milky Way stands over them.'
  },
  {
    id: 'summit',
    title: 'Above the clouds',
    place: 'A summit ridge, 4,000 m',
    blurb: 'From a rocky ridge over a sea of cloud, far peaks breaking through it to the horizon. At night the moon lays a path across the cloud tops.'
  },
  {
    id: 'headland',
    title: 'Headland',
    place: 'Atlantic coast, Ireland',
    blurb: 'High on a sea cliff, looking along the coast to a lighthouse on the point while the surf works the rocks below. At night its beam turns.'
  }
];

window.CONCEPT_CURRENT = {
  id: 'meadow',
  title: 'The meadow',
  place: 'Above Zermatt, Switzerland',
  blurb: 'What the site shows today: lying in the grass of an alpine meadow, looking across the valley at the Matterhorn.',
  stills: '../stills/{look}-wide.webp',
  live: '../?look={look}'
};
