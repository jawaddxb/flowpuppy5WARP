import { describe, it, expect } from 'vitest';
import { validateJoinNode, validateRaceNode, validateMapLoopNode } from './validate';

describe('Runtime Validators', () => {
  describe('validateJoinNode', () => {
    it('should require at least 2 inputs', () => {
      const node = { id: '1', data: { label: 'Join', joinPolicy: 'all' } };
      const graph = { edges: [{ target: '1' }] };
      const result = validateJoinNode(node, graph);
      expect(result.errors).toContain('Join node "Join" requires at least 2 inputs (found 1)');
    });

    it('should validate join policy', () => {
      const node = { id: '1', data: { label: 'Join', joinPolicy: 'invalid' } };
      const graph = { edges: [{ target: '1' }, { target: '1' }] };
      const result = validateJoinNode(node, graph);
      expect(result.errors[0]).toContain('Invalid join policy');
    });
  });

  describe('validateRaceNode', () => {
    it('should require at least 2 competitors', () => {
      const node = { id: '1', data: { label: 'Race' } };
      const graph = { edges: [{ target: '1' }] };
      const result = validateRaceNode(node, graph);
      expect(result.errors).toContain('Race node "Race" requires at least 2 inputs to race (found 1)');
    });

    it('should warn about missing timeout', () => {
      const node = { id: '1', data: { label: 'Race' } };
      const graph = { edges: [{ target: '1' }, { target: '1' }] };
      const result = validateRaceNode(node, graph);
      expect(result.warnings[0]).toContain('timeout');
    });
  });

  describe('validateMapLoopNode', () => {
    it('should require input field', () => {
      const node = { id: '1', data: { label: 'Loop' } };
      const graph = { edges: [] };
      const result = validateMapLoopNode(node, graph);
      expect(result.errors).toContain('MapLoop node "Loop" must specify an input array field');
    });

    it('should require loop body', () => {
      const node = { id: '1', data: { label: 'Loop', inputField: 'items' } };
      const graph = { edges: [] };
      const result = validateMapLoopNode(node, graph);
      expect(result.errors).toContain('MapLoop node "Loop" must have a loop body (no outgoing edges found)');
    });
  });
});
