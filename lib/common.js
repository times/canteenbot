'use strict';

const TODAY = 'today';
const TOMORROW = 'tomorrow';
const MONDAY = 'monday';
const TUESDAY = 'tuesday';
const WEDNESDAY = 'wednesday';
const THURSDAY = 'thursday';
const FRIDAY = 'friday';
const SATURDAY = 'saturday';
const SUNDAY = 'sunday';

// Valid menu types
const menuTypes = [
  TODAY,
  TOMORROW,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
  SUNDAY,
];

// Valid internal message types
const messageTypes = {
  MENU: 'MENU',
  INGREDIENT: 'INGREDIENT',
};

// Days of the week
const days = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Exports
module.exports = {
  menuTypes,
  messageTypes,
  days,
};
