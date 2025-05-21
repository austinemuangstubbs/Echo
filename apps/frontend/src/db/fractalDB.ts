import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface FractalEntity {
  id: string; // uuid
  blob: Blob; // PNG data
  w: number;
  h: number;
  text: string;
  embeddings: number[];
  createdAt: number; // epoch ms
}

class FractalDB extends Dexie {
  fractals!: Table<FractalEntity, string>;

  constructor() {
    super('EchoFractals');
    this.version(1).stores({
      // primary key plus index on createdAt for easy ordering
      fractals: 'id, createdAt'
    });
  }
}

export const db = new FractalDB(); 