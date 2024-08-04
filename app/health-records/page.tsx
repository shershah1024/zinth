// app/test-reports/page.tsx
import MedicalTestsDashboard from '@/components/MedicalTestsDashboard'
import { ProcessedTest } from '@/types/medicalTests'

async function getMedicalTests(): Promise<ProcessedTest[]> {
  const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-health-records`
  console.log('Fetching medical tests from:', apiUrl)

  try {
    const res = await fetch(apiUrl, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('API response not OK:', res.status, res.statusText, errorText)
      throw new Error(`Failed to fetch medical tests: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    return data
  } catch (error) {
    console.error('Error fetching medical tests:', error)
    throw error
  }
}

export default async function MedicalTestsPage() {
  try {
    const medicalTests = await getMedicalTests()
    return <MedicalTestsDashboard initialTestElements={medicalTests} />
  } catch (error) {
    console.error('Error in MedicalTestsPage:', error)
    return <div>Error loading medical tests. Please try again later.</div>
  }
}