/**
 * Visitor Entity
 * Represents a unique user tracked across sessions via a persistent UUID.
 */

export interface Visitor {
  id: string;
  visitorUuid: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVisitorInput {
  visitorUuid: string;
}

export interface UpdateVisitorInput {
  lastSeenAt: Date;
}
