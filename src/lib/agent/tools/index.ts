import { SchemaType, type FunctionDeclaration } from '@google/generative-ai'

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'check_availability',
    description: 'Check if a specific date is available for booking at this venue.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'Date in YYYY-MM-DD format' },
        startTime: { type: SchemaType.STRING, description: 'Optional start time HH:MM' },
        endTime: { type: SchemaType.STRING, description: 'Optional end time HH:MM' },
      },
      required: ['date'],
    },
  },
  {
    name: 'calculate_price',
    description: 'Calculate the price for an event based on guest count, duration, and type.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        guestCount: { type: SchemaType.NUMBER, description: 'Number of guests' },
        durationHours: { type: SchemaType.NUMBER, description: 'Event duration in hours' },
        eventType: { type: SchemaType.STRING, description: 'Type of event' },
        packageName: { type: SchemaType.STRING, description: 'Optional package name' },
      },
      required: ['guestCount', 'durationHours', 'eventType'],
    },
  },
  {
    name: 'get_venue_info',
    description: 'Look up specific information about this venue.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { type: SchemaType.STRING, description: 'What to look up' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'propose_booking',
    description: 'Send a booking proposal to the venue owner for approval. Only call when customer has confirmed.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'Event date YYYY-MM-DD' },
        startTime: { type: SchemaType.STRING, description: 'Start time HH:MM' },
        endTime: { type: SchemaType.STRING, description: 'End time HH:MM' },
        guestCount: { type: SchemaType.NUMBER, description: 'Number of guests' },
        eventType: { type: SchemaType.STRING, description: 'Event type' },
        price: { type: SchemaType.NUMBER, description: 'Total price including platform fee' },
        extras: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'Additional services',
        },
        customerNote: { type: SchemaType.STRING, description: 'Optional customer note' },
      },
      required: ['date', 'startTime', 'endTime', 'guestCount', 'eventType', 'price'],
    },
  },
  {
    name: 'escalate_to_owner',
    description: 'Escalate to venue owner when request is outside your authority.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: { type: SchemaType.STRING, description: 'Why this needs owner input' },
        customerRequest: { type: SchemaType.STRING, description: 'What the customer wants' },
        context: { type: SchemaType.OBJECT, description: 'Additional context', properties: {} },
      },
      required: ['reason', 'customerRequest'],
    },
  },
  {
    name: 'search_other_venues',
    description: 'Search for alternative venues that match customer needs.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        requirements: { type: SchemaType.STRING, description: 'What the customer needs' },
      },
      required: ['requirements'],
    },
  },
]
