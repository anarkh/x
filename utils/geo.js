const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(a, b) {
  const toRad = (degree) => degree * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h)));
}

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

function markerSummary(post) {
  return post.title.length > 12 ? `${post.title.slice(0, 12)}...` : post.title;
}

function markerBorderColor(status) {
  const colors = {
    stale: '#D99028',
    resolved: '#6F817A',
    expired: '#98A39E'
  };
  return colors[status] || '#255F54';
}

export function markerFromPost(post) {
  return {
    id: Number(post.markerId),
    postId: post.id,
    latitude: post.latitude,
    longitude: post.longitude,
    width: 1,
    height: 1,
    anchor: {
      x: 0.5,
      y: 0.5
    },
    callout: {
      content: markerSummary(post),
      color: '#17201D',
      fontSize: 12,
      borderRadius: 8,
      bgColor: '#FFFFFF',
      padding: 7,
      borderColor: markerBorderColor(post.status),
      borderWidth: 1,
      display: 'ALWAYS',
      textAlign: 'center'
    }
  };
}
