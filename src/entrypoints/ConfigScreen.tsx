import { useState } from 'react';
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, FieldGroup, Form, SelectField, TextField } from 'datocms-react-ui';
import { BASEMAP_IDS, getBasemap, type BasemapId } from '../lib/basemaps';
import { isValidLngLat } from '../lib/geometry';
import { MAX_ZOOM, MIN_ZOOM, normalizePluginParameters } from '../lib/parameters';
import styles from './shared.module.css';

type ConfigScreenProps = {
  ctx: RenderConfigScreenCtx;
};

type BasemapOption = { label: string; value: BasemapId };

const BASEMAP_OPTIONS: BasemapOption[] = BASEMAP_IDS.map((id) => ({
  label: getBasemap(id).label,
  value: id,
}));

export default function ConfigScreen({ ctx }: ConfigScreenProps) {
  const current = normalizePluginParameters(ctx.plugin.attributes.parameters);
  const [latitude, setLatitude] = useState(String(current.center[1]));
  const [longitude, setLongitude] = useState(String(current.center[0]));
  const [zoom, setZoom] = useState(String(current.zoom));
  const [basemap, setBasemap] = useState<BasemapId>(current.basemap);
  const [saving, setSaving] = useState(false);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const zoomLevel = Number(zoom);
  const centerIsValid = latitude.trim() !== '' && longitude.trim() !== '' && isValidLngLat(lng, lat);
  const zoomIsValid =
    zoom.trim() !== '' && Number.isFinite(zoomLevel) && zoomLevel >= MIN_ZOOM && zoomLevel <= MAX_ZOOM;

  function handleBasemapChange(option: BasemapOption | readonly BasemapOption[] | null) {
    if (option && 'value' in option) {
      setBasemap(option.value);
    }
  }

  async function handleSubmit() {
    setSaving(true);

    try {
      await ctx.updatePluginParameters({
        ...ctx.plugin.attributes.parameters,
        latitude: lat,
        longitude: lng,
        zoom: zoomLevel,
        basemap,
      });
      ctx.notice('Map defaults saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Canvas ctx={ctx}>
      <Form>
        <FieldGroup>
          <TextField
            id="default-latitude"
            name="default-latitude"
            label="Default latitude"
            hint="Where empty fields open the map. Between -90 and 90."
            value={latitude}
            onChange={setLatitude}
            {...(centerIsValid ? {} : { error: 'Enter a valid latitude and longitude.' })}
            textInputProps={{ inputMode: 'decimal' }}
          />
          <TextField
            id="default-longitude"
            name="default-longitude"
            label="Default longitude"
            hint="Between -180 and 180."
            value={longitude}
            onChange={setLongitude}
            textInputProps={{ inputMode: 'decimal' }}
          />
          <TextField
            id="default-zoom"
            name="default-zoom"
            label="Default zoom"
            hint={`From ${MIN_ZOOM} (whole world) to ${MAX_ZOOM} (building level).`}
            value={zoom}
            onChange={setZoom}
            {...(zoomIsValid ? {} : { error: `Enter a zoom between ${MIN_ZOOM} and ${MAX_ZOOM}.` })}
            textInputProps={{ inputMode: 'decimal' }}
          />
          <SelectField
            id="default-basemap"
            name="default-basemap"
            label="Default basemap"
            hint="Satellite imagery is licensed CC BY-NC-SA 4.0 by EOX, which does not allow commercial use."
            value={BASEMAP_OPTIONS.find((option) => option.value === basemap) ?? null}
            onChange={handleBasemapChange}
            selectInputProps={{ isClearable: false, options: BASEMAP_OPTIONS }}
          />
        </FieldGroup>
        <div className={styles.actions}>
          <Button
            type="button"
            buttonType="primary"
            disabled={saving || !centerIsValid || !zoomIsValid}
            onClick={() => void handleSubmit()}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </Form>
    </Canvas>
  );
}
