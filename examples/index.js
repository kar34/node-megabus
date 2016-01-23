'use strict';

const megabus = require('../lib');

megabus.LOCATION_CODES = {
  'Boston': 94,
  'Chicago': 100,
  'Toronto': 145,
  'New Haven': 122,
  'New York': 123,
};

if (module === require.main) {
  let finder = new megabus.TicketFinder({
    startDate: '3/9/2016',
    endDate: '3/24/2016',
    routes: [
      // Toronto to Chicago
      new megabus.Route('Toronto', 'Chicago'),
      new megabus.Route('Chicago', 'Toronto'),

      // Boston to Chicago
      new megabus.Route('Boston', 'Chicago'),
      new megabus.Route('Chicago', 'Boston'),

      // New York <-> New Haven
      new megabus.Route('New York', 'New Haven'),
      new megabus.Route('New Haven', 'New York'),

    ]
  });

  finder
    // .getTicketsPromise()
    .getTicketsInPriceRangePromise(20, 35)
    .then((tickets) => {
      tickets.forEach((ticket, idx) => {
        console.log(`[${idx + 1}] ${ticket.toString()}`);
      })
      console.log(`*** ${tickets.length} tickets found ***`);
    });
}
