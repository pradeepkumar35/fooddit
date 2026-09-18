import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

/* jsdom never builds a real Leaflet map: stub the react-leaflet surface and
   assert on the marker/popup contract instead. */
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="leaflet-map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children, center }) => (
    <div data-testid="map-marker" data-center={center.join(',')}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), flyTo: vi.fn() }),
}))

import MapView from './MapView'

const ROWS = [
  {
    id: 'r1',
    name: 'Kalra Sweets',
    cuisineType: 'Sweets',
    locality: 'Ballupur',
    latitude: 30.341,
    longitude: 78.006,
    avgRating: 4.6,
    reviewCount: 12,
    imageUrl: 'https://img/x.jpg',
  },
  {
    id: 'r2',
    name: 'Nowhere Diner',
    cuisineType: 'Cafe',
    locality: 'Nowhere',
    latitude: null,
    longitude: null,
    avgRating: 3.2,
    reviewCount: 0,
    imageUrl: null,
  },
]

const renderMap = (props = {}) =>
  render(
    <MemoryRouter>
      <MapView rows={ROWS} loading={false} {...props} />
    </MemoryRouter>,
  )

describe('MapView', () => {
  it('plots one marker per row that has coordinates', () => {
    renderMap()
    const markers = screen.getAllByTestId('map-marker')
    expect(markers).toHaveLength(1)
    expect(markers[0]).toHaveAttribute('data-center', '30.341,78.006')
  })

  it('shows a dossier link and rating in the popup', () => {
    renderMap()
    expect(screen.getByText('Kalra Sweets')).toBeInTheDocument()
    expect(screen.getByText(/4\.6 · 12 reviews/)).toBeInTheDocument()
    expect(screen.getByText('Open the dossier →').closest('a')).toHaveAttribute(
      'href',
      '/restaurants/r1',
    )
  })

  it('shows the empty state when nothing is plottable', () => {
    renderMap({ rows: [] })
    expect(screen.queryAllByTestId('map-marker')).toHaveLength(0)
    expect(screen.getByText('No restaurants to plot here yet.')).toBeInTheDocument()
  })

  it('hides the empty state while loading', () => {
    renderMap({ rows: [], loading: true })
    expect(screen.queryByText('No restaurants to plot here yet.')).not.toBeInTheDocument()
  })
})
