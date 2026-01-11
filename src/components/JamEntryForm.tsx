import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'
import { RosterJammerData, RosterLineData } from '../pages/EnterGameStats'

interface JamFormData {
  home_jammer_id: string
  home_line_id: string
  home_points: number
  visiting_jammer_id: string
  visiting_line_id: string
  visiting_points: number
  lead_team: 'home' | 'visiting' | null
}

interface JamEntryFormProps {
  game: Game
  period: 1 | 2
  jamNumber: number
  homeJammers: RosterJammerData[]
  homeLines: RosterLineData[]
  visitingJammers: RosterJammerData[]
  visitingLines: RosterLineData[]
  onPeriodChange: () => void
  onPreviousJam: () => void
  onNextJam: () => void
}

export interface JamEntryFormRef {
  saveJam: () => Promise<void>
}

const JamEntryForm = forwardRef<JamEntryFormRef, JamEntryFormProps>(({
  game,
  period,
  jamNumber,
  homeJammers,
  homeLines,
  visitingJammers,
  visitingLines,
  onPeriodChange,
  onPreviousJam,
  onNextJam
}, ref) => {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<JamFormData>({
    home_jammer_id: '',
    home_line_id: '',
    home_points: 0,
    visiting_jammer_id: '',
    visiting_line_id: '',
    visiting_points: 0,
    lead_team: null
  })

  useEffect(() => {
    async function loadJam() {
      try {
        const { data, error } = await supabase
          .from('jams')
          .select('*')
          .eq('game_id', game.id)
          .eq('period', period)
          .eq('jam_number', jamNumber)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setFormData({
            home_jammer_id: data.home_jammer_id || '',
            home_line_id: data.home_line_id || '',
            home_points: data.home_points,
            visiting_jammer_id: data.visiting_jammer_id || '',
            visiting_line_id: data.visiting_line_id || '',
            visiting_points: data.visiting_points,
            lead_team: data.lead_team
          })
        } else {
          setFormData({
            home_jammer_id: '',
            home_line_id: '',
            home_points: 0,
            visiting_jammer_id: '',
            visiting_line_id: '',
            visiting_points: 0,
            lead_team: null
          })
        }
      } catch (error) {
        console.error('Error loading jam:', error)
      }
    }

    loadJam()
  }, [game.id, period, jamNumber])

  const isJamEmpty = () => {
    return (
      !formData.home_jammer_id &&
      !formData.home_line_id &&
      formData.home_points === 0 &&
      !formData.visiting_jammer_id &&
      !formData.visiting_line_id &&
      formData.visiting_points === 0 &&
      !formData.lead_team
    )
  }

  const saveJam = async () => {
    // Don't save if the jam is empty
    if (isJamEmpty()) {
      return
    }

    try {
      setSaving(true)

      const jamData = {
        game_id: game.id,
        period,
        jam_number: jamNumber,
        home_jammer_id: formData.home_jammer_id || null,
        home_line_id: formData.home_line_id || null,
        home_points: formData.home_points,
        visiting_jammer_id: formData.visiting_jammer_id || null,
        visiting_line_id: formData.visiting_line_id || null,
        visiting_points: formData.visiting_points,
        lead_team: formData.lead_team
      }

      const { error } = await supabase
        .from('jams')
        .upsert(jamData, {
          onConflict: 'game_id,period,jam_number'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving jam:', error)
      alert('Failed to save jam data')
    } finally {
      setSaving(false)
    }
  }

  const handlePreviousJam = async () => {
    await saveJam()
    onPreviousJam()
  }

  const handleNextJam = async () => {
    await saveJam()
    onNextJam()
  }

  const updateFormField = <K extends keyof JamFormData>(field: K, value: JamFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  useImperativeHandle(ref, () => ({
    saveJam
  }))

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Period {period}</h4>
          <button
            className="btn btn-primary"
            onClick={onPeriodChange}
            disabled={saving}
          >
            Change to Period {period === 1 ? 2 : 1}
          </button>
        </div>

        <div className="text-center mb-4">
          <h3>Jam {jamNumber}</h3>
        </div>

        <div className="row">
          <div className="col-md-6">
            <h5 className="text-center mb-3">
              {game.home_team_color && (
                <span
                  className="d-inline-block me-2"
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: game.home_team_color,
                    border: '1px solid #dee2e6',
                    borderRadius: '3px',
                    verticalAlign: 'middle'
                  }}
                ></span>
              )}
              {game.home_team?.name || 'Home'}
            </h5>

            <div className="mb-3">
              <label className="form-label">Jammer</label>
              <select
                className="form-select"
                value={formData.home_jammer_id}
                onChange={(e) => updateFormField('home_jammer_id', e.target.value)}
              >
                <option value="">Select Jammer</option>
                {homeJammers.map((jammer) => (
                  <option key={jammer.id} value={jammer.skater_id}>
                    {`#${jammer.skater.number} ${jammer.skater.name}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Line</label>
              <select
                className="form-select"
                value={formData.home_line_id}
                onChange={(e) => updateFormField('home_line_id', e.target.value)}
              >
                <option value="">Select Line</option>
                {homeLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Points</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={formData.home_points}
                onChange={(e) => updateFormField('home_points', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="homeLeadCheckbox"
                  checked={formData.lead_team === 'home'}
                  onChange={() => updateFormField('lead_team', formData.lead_team === 'home' ? null : 'home')}
                />
                <label className="form-check-label" htmlFor="homeLeadCheckbox">
                  Lead Jammer
                </label>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <h5 className="text-center mb-3">
              {game.visiting_team_color && (
                <span
                  className="d-inline-block me-2"
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: game.visiting_team_color,
                    border: '1px solid #dee2e6',
                    borderRadius: '3px',
                    verticalAlign: 'middle'
                  }}
                ></span>
              )}
              {game.visiting_team?.name || 'Visiting'}
            </h5>

            <div className="mb-3">
              <label className="form-label">Jammer</label>
              <select
                className="form-select"
                value={formData.visiting_jammer_id}
                onChange={(e) => updateFormField('visiting_jammer_id', e.target.value)}
              >
                <option value="">Select Jammer</option>
                {visitingJammers.map((jammer) => (
                  <option key={jammer.id} value={jammer.skater_id}>
                    {`#${jammer.skater.number} ${jammer.skater.name}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Line</label>
              <select
                className="form-select"
                value={formData.visiting_line_id}
                onChange={(e) => updateFormField('visiting_line_id', e.target.value)}
              >
                <option value="">Select Line</option>
                {visitingLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Points</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={formData.visiting_points}
                onChange={(e) => updateFormField('visiting_points', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="visitingLeadCheckbox"
                  checked={formData.lead_team === 'visiting'}
                  onChange={() => updateFormField('lead_team', formData.lead_team === 'visiting' ? null : 'visiting')}
                />
                <label className="form-check-label" htmlFor="visitingLeadCheckbox">
                  Lead Jammer
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between mt-4">
          <button
            className="btn btn-secondary"
            onClick={handlePreviousJam}
            disabled={jamNumber === 1 || saving}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Previous Jam
          </button>
          <button
            className="btn btn-primary"
            onClick={saveJam}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Save
              </>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNextJam}
            disabled={saving}
          >
            Next Jam
            <i className="bi bi-arrow-right ms-2"></i>
          </button>
        </div>
      </div>
    </div>
  )
})

export default JamEntryForm
