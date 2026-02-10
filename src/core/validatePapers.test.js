import { describe, it, expect } from 'vitest';
import { papers } from '../data/papers.js';
import { validatePapers } from './validatePapers.js';

const clone = (list) => list.map((item) => ({ ...item }));

describe('validatePapers', () => {
  it('passes with correct list', () => {
    const result = validatePapers(papers);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validPapers).toHaveLength(30);
  });

  it('fails when length does not match', () => {
    const shortList = clone(papers).slice(0, 29);
    const result = validatePapers(shortList);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.code === 'length_mismatch')).toBe(true);
  });

  it('fails when ids are duplicated', () => {
    const list = clone(papers);
    list[1].id = 1;
    const result = validatePapers(list);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.code === 'duplicate_id')).toBe(true);
    expect(result.validPapers.some((paper) => paper.id === 1)).toBe(false);
    expect(result.validPapers).toHaveLength(28);
  });

  it('fails when ids are out of range', () => {
    const list = clone(papers);
    list[0].id = 31;
    const result = validatePapers(list);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.code === 'id_out_of_range')).toBe(true);
  });

  it('fails when url is invalid', () => {
    const list = clone(papers);
    list[3].url = 'not-a-url';
    const result = validatePapers(list);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.code === 'invalid_url')).toBe(true);
  });

  it('fails when title is empty', () => {
    const list = clone(papers);
    list[5].title = '   ';
    const result = validatePapers(list);
    expect(result.ok).toBe(false);
    expect(result.errors.some((err) => err.code === 'invalid_title')).toBe(true);
  });
});
