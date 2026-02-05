import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Stops } from './Stops.js';
import { papers } from '../data/papers.js';

describe('Stops', () => {
  it('creates a stop for each paper', () => {
    const scene = new THREE.Scene();
    const track = { radiusX: 26, radiusZ: 18, roadWidth: 5 };
    const stops = new Stops(scene, papers, track);
    expect(stops.stops.length).toBe(30);
    const ids = stops.stops.map((stop) => stop.paper.id);
    expect(new Set(ids).size).toBe(30);
  });
});
