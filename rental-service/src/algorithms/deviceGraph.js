/**
 * P10: Device Dependency Graph — BFS/DFS Traversal
 * Time: O(V + E), Space: O(V + E)
 *
 * Builds an adjacency list from device data and performs BFS to find
 * all devices that depend on a given device (direct + transitive).
 */

function buildGraph(devices) {
  const graph = {};
  for (const device of devices) {
    const id = device.id || device.deviceId;
    if (!graph[id]) graph[id] = [];
    if (device.dependencies) {
      for (const dep of device.dependencies) {
        if (!graph[dep]) graph[dep] = [];
        graph[dep].push(id); // dep → id means id depends on dep
      }
    }
  }
  return graph;
}

function findDependents(graph, deviceId) {
  const visited = new Set();
  const queue = [deviceId];
  visited.add(deviceId);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  visited.delete(deviceId); // Don't include the queried device itself
  return [...visited];
}

export { buildGraph, findDependents };
