import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Game, GameRoster } from '../types/Skater'

interface UploadStatsFormProps {
  show: boolean
  game: Game
  homeRoster: GameRoster
  visitingRoster: GameRoster
  onClose: () => void
  onSuccess: () => void
  onError: (error: Error) => void
}

function UploadStatsForm({ show, game, homeRoster, visitingRoster, onClose, onSuccess, onError }: UploadStatsFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setValidationErrors([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setValidationErrors(['Please select a CSV file.'])
      return
    }

    setValidationErrors([])
    setSubmitting(true)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim() !== '')

      // Build lookup maps from rosters
      const homeJammerMap = new Map<string, string>()
      for (const rj of homeRoster.roster_jammers || []) {
        if (rj.skater?.number) {
          homeJammerMap.set(rj.skater.number, rj.skater_id)
        }
      }

      const visitingJammerMap = new Map<string, string>()
      for (const rj of visitingRoster.roster_jammers || []) {
        if (rj.skater?.number) {
          visitingJammerMap.set(rj.skater.number, rj.skater_id)
        }
      }

      const homeLineMap = new Map<string, string>()
      for (const rl of homeRoster.roster_lines || []) {
        homeLineMap.set(rl.name, rl.id)
      }

      const errors: string[] = []
      const jams: Array<{
        game_id: string
        period: number
        jam_number: number
        home_jammer_id: string | null
        visiting_jammer_id: string | null
        home_line_id: string | null
        home_points: number
        visiting_points: number
        lead_team: 'home' | 'visiting' | null
      }> = []

      for (let i = 0; i < lines.length; i++) {
        const rowNum = i + 1
        const cols = lines[i].split(',').map(c => c.trim())

        if (cols.length !== 9) {
          errors.push(`Row ${rowNum}: expected 9 columns, got ${cols.length}.`)
          continue
        }

        const [periodStr, jamNumStr, ourJammer, theirJammer, ourLine, ourLeadStr, theirLeadStr, ourPointsStr, theirPointsStr] = cols

        const period = parseInt(periodStr, 10)
        const jamNumber = parseInt(jamNumStr, 10)
        if (isNaN(period) || isNaN(jamNumber)) {
          errors.push(`Row ${rowNum}: period and jam number must be valid numbers.`)
          continue
        }

        // Resolve our jammer
        let homeJammerId: string | null = null
        if (ourJammer !== '') {
          const found = homeJammerMap.get(ourJammer)
          if (!found) {
            errors.push(`Row ${rowNum}: our jammer "${ourJammer}" not found in our roster.`)
          } else {
            homeJammerId = found
          }
        }

        // Resolve their jammer
        let visitingJammerId: string | null = null
        if (theirJammer !== '') {
          const found = visitingJammerMap.get(theirJammer)
          if (!found) {
            errors.push(`Row ${rowNum}: their jammer "${theirJammer}" not found in opposing roster.`)
          } else {
            visitingJammerId = found
          }
        }

        // Resolve our line
        let homeLineId: string | null = null
        if (ourLine !== '') {
          const found = homeLineMap.get(ourLine)
          if (!found) {
            errors.push(`Row ${rowNum}: our line "${ourLine}" not found in our roster.`)
          } else {
            homeLineId = found
          }
        }

        // Validate lead
        const ourLead = parseInt(ourLeadStr, 10)
        const theirLead = parseInt(theirLeadStr, 10)
        if (ourLead === 1 && theirLead === 1) {
          errors.push(`Row ${rowNum}: both teams cannot have lead on the same jam.`)
        }

        let leadTeam: 'home' | 'visiting' | null = null
        if (ourLead === 1) leadTeam = 'home'
        else if (theirLead === 1) leadTeam = 'visiting'

        // Validate points
        const ourPoints = parseInt(ourPointsStr, 10)
        const theirPoints = parseInt(theirPointsStr, 10)
        if (isNaN(ourPoints) || isNaN(theirPoints)) {
          errors.push(`Row ${rowNum}: points must be valid numbers.`)
        } else {
          if (ourPoints < 0) {
            errors.push(`Row ${rowNum}: our points cannot be negative (${ourPoints}).`)
          }
          if (theirPoints < 0) {
            errors.push(`Row ${rowNum}: their points cannot be negative (${theirPoints}).`)
          }
        }

        // Only add to jams array if no errors on this row's critical fields
        if (errors.length === 0 || !errors.some(e => e.startsWith(`Row ${rowNum}:`))) {
          jams.push({
            game_id: game.id,
            period,
            jam_number: jamNumber,
            home_jammer_id: homeJammerId,
            visiting_jammer_id: visitingJammerId,
            home_line_id: homeLineId,
            home_points: ourPoints,
            visiting_points: theirPoints,
            lead_team: leadTeam
          })
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        setSubmitting(false)
        return
      }

      // All valid — upsert jams
      const { error } = await supabase
        .from('jams')
        .upsert(jams, { onConflict: 'game_id,period,jam_number' })

      if (error) throw error

      if (fileInputRef.current) fileInputRef.current.value = ''
      onSuccess()
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to upload stats'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!show) return null

  return (
    <>
      <div className="modal show d-block" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Upload Game Stats</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                disabled={submitting}
              ></button>
            </div>
            <div className="modal-body">
              {validationErrors.length > 0 && (
                <div className="alert alert-danger">
                  <strong>Errors found in CSV:</strong>
                  <ul className="mb-0 mt-2">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">CSV File</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".csv"
                  ref={fileInputRef}
                  disabled={submitting}
                />
                <div className="form-text">
                  Expected format: period, jam number, our jammer #, their jammer #, our line, our lead (1/0), their lead (1/0), our points, their points
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-info"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-upload me-2"></i>
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  )
}

export default UploadStatsForm
