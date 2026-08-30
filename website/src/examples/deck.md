---
sidebar_position: 2
title: Deck + TangramLayer
description: A deck.gl basemap integration powered by Tangram.
---

import ExampleDeviceTabs from '@site/src/components/ExampleDeviceTabs';
import DeckExample from '@site/src/components/DeckExample';

Compare a Tangram basemap and deck.gl overlays on WebGPU or WebGL.

The view selector includes supported flat and perspective `MapView` modes plus
`GlobeView` and `FirstPersonView` capability previews. The latter two keep the
deck.gl overlays visible and describe the renderer adapters still required
before Tangram geometry can participate in those projections.

<ExampleDeviceTabs />

<DeckExample />
