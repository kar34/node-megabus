'use strict';

/**
 * Imports querystring for string manipulation
 * @requires querystring
 */
const querystring = require('querystring');

/**
 * Imports lodash for modularity, performance, & extras
 * @requires lodash
 */
const _ = require('lodash');

/**
 * Imports cheerio for core jQuery functionality specifically for servers
 * @requires cheerio
 */
const cheerio = require('cheerio');

/**
 * Imports node-fetch for client-side and server-side http requests
 * @requires node-fetch
 */
const fetch = require('node-fetch');

/**
 * Imports moment for parsing and formatting dates
 * @requires moment
 */
const moment = require('moment');

/**
 * Stores an id for each city
 * 
 */
exports.LOCATION_CODES = {
  'Boston': 94,
  'Chicago': 100,
  'Toronto': 145,
  'New Haven': 122,
  'New York': 123,
};

/**
 * Constructs the origin and destination for the trip
 * @params {String} origin Beginning point of the trip
 * @params {String} destination The end destination of the trip
 */
class Route {
  constructor(origin, destination) {
    if (!exports.LOCATION_CODES[origin]) {
      throw new Error(`Unknown origin: ${origin}`); // Throws an error if origin does not exist in database
    }
    if (!exports.LOCATION_CODES[destination]) {
      throw new Error(`Unknown destination: ${destination}`); // Throws an error if destination does not exist in database
    }
    this.origin = origin;
    this.originCode = exports.LOCATION_CODES[origin];
    this.destination = destination;
    this.destinationCode = exports.LOCATION_CODES[destination];
  }
}

/**
 * Constructs information about a ticket
 * @params {Object} data Stores info about a ticket
 * 
 */
class Ticket {
  constructor(data) {
    this.origin = data.origin;
    this.destination = data.destination;
    this.date = data.date;
    this.departure = data.departure;
    this.arrival = data.arrival;
    this.price = data.price;
  }

/**
 * Displays information about the ticket in a String
 * @return {String} Information about the ticket
 */
  toString() {
    return `{$${this.price}} ${this.origin} -> ${this.destination} (${this.date} ${this.departure} - ${this.arrival})`;
  }
}

/**
 * Finds all the possible tickets in the specified date range 
 * @params {Object} data Stores info about a ticket
 */
class TicketFinder {
  constructor(data) {
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.routes = data.routes;
  }

  _buildURL(date, originCode, departureCode) {
    let qs = querystring.stringify({
      originCode: originCode,
      destinationCode: departureCode,
      outboundDepartureDate: date,
      inboundDepartureDate: '',
      passengerCount: 1,
      transportType: 0,
      concessionCount: 0,
      nusCount: 0,
      outboundWheelchairSeated: 0,
      outboundOtherDisabilityCount: 0,
      inboundWheelchairSeated: 0,
      inboundOtherDisabilityCount: 0,
      outboundPcaCount: 0,
      inboundPcaCount: 0,
      promotionCode: '',
      withReturn: 0
    });
    return `http://us.megabus.com/JourneyResults.aspx?${qs}`;
  }

  _getHTMLPromise(url) {
    return fetch(url)
      .then((res) => {
        return res.text();
      });
  }

  _parseTickets(html, date, route) {
    let $ = cheerio.load(html);
    let items = $('#JourneyResylts_OutboundList_main_div > ul')
      .not('.heading')
      .toArray();
    return items.map((item) => {
      let $item = $(item);
      let departure = /Departs\s+(.*)\s+/.exec($item.find('.two > p:nth-child(1)').text());
      let arrival = /Arrives\s+(.*)\s+/.exec($item.find('.two > p:nth-child(2)').text());
      let price = /\$([\d.]+)/.exec($item.find('.five > p').text());
      return new Ticket({
        origin: route.origin,
        destination: route.destination,
        date: date,
        departure: departure && departure[1],
        arrival: arrival && arrival[1],
        price: price && +price[1]
      });
    });
  }

  _getTicketsPromise(date, route) {
    let url = this._buildURL(date, route.originCode, route.destinationCode);
    return this._getHTMLPromise(url).then((html) => {
      return this._parseTickets(html, date, route);
    });
  }

/**
 * Finds all the possible tickets in the specified date range 
 * @return results {Array} Returns a list of all the tickets in the date range
 */
  getTicketsPromise() {
    let startDate = moment(this.startDate, 'MM/DD/YYYY');
    let endDate = moment(this.endDate, 'MM/DD/YYYY');
    let promises = [];
    for (let date = moment(startDate); !date.isAfter(endDate); date.add(1, 'days')) {
      this.routes.forEach((route) => {
        promises.push(this._getTicketsPromise(date.format('MM/DD/YYYY'), route));
      });
    }
    return Promise.all(promises)
      .then((results) => {
        return _.flatten(results);
      });
  }

/**
 * Finds all the possible tickets in the specified price range 
 * @params {Number} min Minimum price desired
 * @params {Number} max Maximum price desired
 * @return tickets {Array} Returns a list of all the tickets in the price range
 */
  getTicketsInPriceRangePromise(min, max) {
    return this.getTicketsPromise().then((tickets) => {
      return tickets.filter((ticket) => {
        return min <= ticket.price && ticket.price <= max;
      });
    });
  }
}

exports.Route = Route;
exports.Ticket = Ticket;
exports.TicketFinder = TicketFinder;
