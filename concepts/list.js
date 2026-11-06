/* The concepts on trial for the hero, in the order the preview turns
   through them. Each names its scene file (scenes/<id>.js), where it is,
   and a line on what the eye sees; the meadow is the picture the site
   has now, kept here to be compared against. */

window.CONCEPT_LIST = [
  {
    id: 'fjord',
    title: 'Nærøyfjord',
    place: 'Vestland, Norway',
    blurb: 'Afloat at water level in Norway\u2019s narrowest fjord, its forested walls rising 1,400 m into their own reflection. At night the aurora lights it twice.'
  },
  {
    id: 'dunes',
    title: 'Deadvlei',
    place: 'Sossusvlei, Namibia',
    blurb: 'On the white clay pan among camel-thorn trees dead for centuries, with Big Daddy rising red behind them. At night the Milky Way stands over the trees.'
  },
  {
    id: 'summit',
    title: 'Above the clouds',
    place: 'Mount Fuji from the Southern Alps, Japan',
    blurb: 'From an alpine ridge in the Akaishi Mountains, Fuji rising beyond ridge after ridge and the bands of cloud between them. At dusk it glows red under the Belt of Venus.'
  },
  {
    id: 'headland',
    title: 'Neist Point',
    place: 'Isle of Skye, Scotland',
    blurb: 'From the clifftop above Neist Point, the basalt ridge of An t-Aigeach running out to its lighthouse. The sun sets beyond it, and at night its beam turns.'
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
