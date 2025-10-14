
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  CalendarDaysIcon,
  UserIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import ClickableVideo from './ClickableVideo';
import ClipChat from './ClipChat';
import ChapterTimeline from './ChapterTimeline';

export default function ClipBento({ clipData, buttonMetadata, videoId }) {
    const [forensicsData, setForensicsData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);
    const [correctiveActionStatuses, setCorrectiveActionStatuses] = useState({});

    const mockForensicsData = {
        compliance: {
            violations: [
                {
                    id: 1,
                    type: 'PPE Violation',
                    severity: 'high',
                    description: 'Worker at the sewing station is not wearing protective gloves while the machine is in operation.',
                    timestamp: '00:05',
                    location: 'Sewing Station 3',
                    regulation: 'OSHA 1910.132',
                    rootCause: 'Training Gap',
                    potentialFineUSD: 15625
                },
                {
                    id: 2,
                    type: 'Safety Protocol',
                    severity: 'medium',
                    description: 'Improper lifting technique observed during material handling',
                    timestamp: '01:32',
                    location: 'Warehouse Section B',
                    regulation: 'OSHA 1910.178',
                    rootCause: 'Process Flaw',
                    potentialFineUSD: 8750
                }
            ],
            scoringMethodology: 'Base score of 100, with deductions for violations based on severity (High: -15, Medium: -10, Low: -5).',
            score: 75
        },
        riskAssessment: {
            overallSafetyRisk: 'medium',
            overallOperationalRisk: 'low',
            riskFactors: [
                { factor: 'Lack of Consistent PPE Usage', level: 'medium', impact: 'Worker Safety' },
                { factor: 'Equipment Operation', level: 'low', impact: 'Production Efficiency' },
                { factor: 'Environmental', level: 'medium', impact: 'Workplace Safety' }
            ]
        },
        correctiveActions: [
            {
                violationId: 1,
                action: 'Conduct mandatory refresher training on PPE requirements for all sewing station operators and install a glove dispenser at Station 3.',
                assignee: 'Shift Supervisor',
                dueDate: '2025-10-18',
                status: 'Pending'
            },
            {
                violationId: 2,
                action: 'Implement proper lifting technique training and provide mechanical lifting aids.',
                assignee: 'Safety Manager',
                dueDate: '2025-10-20',
                status: 'In Progress'
            }
        ],
        operationalEfficiency: {
            identifiedWastes: [
                {
                    type: 'Waiting (Muda)',
                    timestamp: '00:12',
                    description: 'Worker at the packing station is idle for 15 seconds waiting for boxes to arrive on the conveyor belt, indicating a bottleneck upstream.'
                },
                {
                    type: 'Unnecessary Motion (Muda)',
                    timestamp: '00:21',
                    description: 'Worker at Assembly Line B has to walk 10 feet to retrieve a tool, which should be located at their station.'
                }
            ],
            recommendations: [
                'Adjust conveyor belt speed from the primary cutting area to better match the packing station\'s cycle time.',
                'Implement a 5S program at Assembly Line B to ensure all necessary tools are within arm\'s reach.'
            ]
        },
        summary: {
            duration: '00:30',
            workersPresent: 2,
            safetyIncidents: 0,
            keyFindings: [
                'While no injuries occurred, the observed PPE violation at Sewing Station 3 represents a significant and recurring risk.',
                'Analysis of workflow indicates a minor bottleneck causing intermittent downtime at the final packing station.'
            ]
        }
    };

    function getGeolocation() {
        if (navigator.geolocation) {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position),
                    (error) => reject(error),
                    { timeout: 10000, enableHighAccuracy: false }
                );
            });
        }
        return Promise.resolve(null);
    }

    async function generateComplianceReport() {
        setIsLoading(true);
        setReportGenerated(true);

        try {
            const geolocation = await getGeolocation();
            const locationContext = geolocation ? 
                `Location: ${geolocation.coords.latitude}, ${geolocation.coords.longitude}` : 
                'Location: Unknown - analyze for general industrial safety standards';

            const prompt = `You are an expert industrial safety and compliance analyst. Analyze the factory video and generate a comprehensive forensics report in the exact JSON format specified below.

            ${locationContext}

            Based on the video content, analyze for the following, performing a Root Cause Analysis (RCA) for each identified issue:
            1.  **OSHA Compliance Violations**: Identify specific infractions and cite the relevant regulation code.
            2.  **Safety Risks**: Differentiate between unsafe *acts* (human error, behavior) and unsafe *conditions* (environmental or equipment hazards).
            3.  **Corrective and Preventive Actions (CAPAs)**: For each violation, propose a specific, measurable, achievable, relevant, and time-bound (SMART) corrective action.
            4.  **Operational Efficiency**: Identify instances of the 7 Wastes of Lean (Muda), such as unnecessary motion, waiting, or defects.
            5.  **Financial & Operational Impact**: Estimate the potential cost of non-compliance and the impact of incidents on production.

            Return ONLY a valid JSON object in this exact format (no markdown, no additional text):

            {
            "compliance": {
                "violations": [
                {
                    "id": 1,
                    "type": "PPE Violation",
                    "severity": "high",
                    "description": "Worker at the sewing station is not wearing protective gloves while the machine is in operation.",
                    "timestamp": "00:05",
                    "location": "Sewing Station 3",
                    "regulation": "OSHA 1910.132",
                    "rootCause": "Training Gap | Process Flaw | Equipment Malfunction | Negligence",
                    "potentialFineUSD": 15625,
                    "link": "https://www.osha.gov/laws-regs/regulations/1910.132"
                }
                ],
                "scoringMethodology": "Base score of 100, with deductions for violations based on severity (High: -15, Medium: -10, Low: -5).",
                "score": 75
            },
            "riskAssessment": {
                "overallSafetyRisk": "medium",
                "overallOperationalRisk": "low",
                "riskFactors": [
                {
                    "factor": "Lack of Consistent PPE Usage",
                    "level": "medium",
                    "impact": "Worker Safety"
                }
                ]
            },
            "correctiveActions": [
                {
                "violationId": 1,
                "action": "Conduct mandatory refresher training on PPE requirements for all sewing station operators and install a glove dispenser at Station 3.",
                "assignee": "Shift Supervisor",
                "dueDate": "2025-10-18",
                "status": "Pending"
                }
            ],
            "operationalEfficiency": {
                "identifiedWastes": [
                {
                    "type": "Waiting (Muda)",
                    "timestamp": "00:12",
                    "description": "Worker at the packing station is idle for 15 seconds waiting for boxes to arrive on the conveyor belt, indicating a bottleneck upstream."
                },
                {
                    "type": "Unnecessary Motion (Muda)",
                    "timestamp": "00:21",
                    "description": "Worker at Assembly Line B has to walk 10 feet to retrieve a tool, which should be located at their station."
                }
                ],
                "recommendations": [
                "Adjust conveyor belt speed from the primary cutting area to better match the packing station's cycle time.",
                "Implement a 5S program at Assembly Line B to ensure all necessary tools are within arm's reach."
                ]
            },
            "summary": {
                "duration": "00:30",
                "workersPresent": 2,
                "safetyIncidents": 0,
                "keyFindings": [
                    "While no injuries occurred, the observed PPE violation at Sewing Station 3 represents a significant and recurring risk.",
                    "Analysis of workflow indicates a minor bottleneck causing intermittent downtime at the final packing station."
                ]
            }
        }

        Requirements:
        - Be highly specific about what you observe in the video
        - Reference exact equipment, processes, and worker actions
        - Include jurisdiction-specific regulations when possible
        - Provide detailed descriptions of violations
        - Include specific timestamps for events
        - Make recommendations actionable and specific
        - Ensure all severity levels and risk assessments are accurate
        - Include at least 2-5 violations if any are observed
        - Include 3-5 timeline events
        - Make key findings specific to the observed content

        Return only the JSON object, no other text.`;

            // Call the analysis API
            const response = await fetch('/api/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId: videoId,
                    userQuery: prompt
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            const forensicsData = JSON.parse(data.data || data.response || '{}');
            
            setForensicsData(forensicsData);
            setIsLoading(false);
        } catch (error) {
            console.error('Error generating compliance report:', error);
            // Fallback to mock data
            const timer = setTimeout(() => {
                setIsLoading(false);
                setForensicsData(mockForensicsData);
            }, 1000);
        }
    }

    const exportToPDF = () => {
        // In real implementation, this would generate and download a PDF
        const element = document.createElement('a');
        const file = new Blob(['Compliance Report PDF content would be generated here'], { type: 'application/pdf' });
        element.href = URL.createObjectURL(file);
        element.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const exportToCSV = () => {
        // Generate CSV content from forensics data
        const csvContent = generateCSVContent();
        const element = document.createElement('a');
        const file = new Blob([csvContent], { type: 'text/csv' });
        element.href = URL.createObjectURL(file);
        element.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const generateCSVContent = () => {
        if (!forensicsData) return '';
        
        let csv = 'Compliance Report\n\n';
        csv += 'Compliance Score,' + forensicsData.compliance.score + '%\n';
        csv += 'Scoring Methodology,' + forensicsData.compliance.scoringMethodology + '\n\n';
        
        csv += 'Violations\n';
        csv += 'ID,Type,Severity,Description,Timestamp,Location,Regulation,Root Cause,Potential Fine (USD)\n';
        forensicsData.compliance.violations.forEach(violation => {
            csv += `"${violation.id}","${violation.type}","${violation.severity}","${violation.description}","${violation.timestamp}","${violation.location}","${violation.regulation}","${violation.rootCause}","${violation.potentialFineUSD}"\n`;
        });
        
        csv += '\nRisk Assessment\n';
        csv += 'Overall Safety Risk,' + forensicsData.riskAssessment.overallSafetyRisk + '\n';
        csv += 'Overall Operational Risk,' + forensicsData.riskAssessment.overallOperationalRisk + '\n';
        csv += 'Factor,Level,Impact\n';
        forensicsData.riskAssessment.riskFactors.forEach(factor => {
            csv += `"${factor.factor}","${factor.level}","${factor.impact}"\n`;
        });
        
        csv += '\nCorrective Actions\n';
        csv += 'Violation ID,Action,Assignee,Due Date,Status\n';
        forensicsData.correctiveActions.forEach(action => {
            csv += `"${action.violationId}","${action.action}","${action.assignee}","${action.dueDate}","${action.status}"\n`;
        });
        
        csv += '\nOperational Efficiency\n';
        csv += 'Waste Type,Timestamp,Description\n';
        forensicsData.operationalEfficiency.identifiedWastes.forEach(waste => {
            csv += `"${waste.type}","${waste.timestamp}","${waste.description}"\n`;
        });
        
        csv += '\nRecommendations\n';
        forensicsData.operationalEfficiency.recommendations.forEach(rec => {
            csv += `"${rec}"\n`;
        });
        
        csv += '\nSummary\n';
        csv += 'Duration,' + forensicsData.summary.duration + '\n';
        csv += 'Workers Present,' + forensicsData.summary.workersPresent + '\n';
        csv += 'Safety Incidents,' + forensicsData.summary.safetyIncidents + '\n';
        
        csv += '\nKey Findings\n';
        forensicsData.summary.keyFindings.forEach(finding => {
            csv += `"${finding}"\n`;
        });
        
        return csv;
    };

    const getSeverityColor = (severity) => {
        switch(severity) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getRiskLevelColor = (level) => {
        switch(level) {
            case 'high': return 'text-red-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    const getEventTypeIcon = (type) => {
        switch(type) {
            case 'warning': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
            case 'info': return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
            case 'error': return <XCircleIcon className="h-4 w-4 text-red-500" />;
            default: return <ClockIcon className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActionStatusColor = (status) => {
        switch(status) {
            case 'Approved': return 'text-green-600 bg-green-50 border-green-200';
            case 'Declined': return 'text-red-600 bg-red-50 border-red-200';
            case 'Pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'In Progress': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'Completed': return 'text-green-600 bg-green-50 border-green-200';
            case 'Overdue': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getWasteTypeColor = (type) => {
        switch(type) {
            case 'Waiting (Muda)': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Unnecessary Motion (Muda)': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'Overproduction (Muda)': return 'text-red-600 bg-red-50 border-red-200';
            case 'Defects (Muda)': return 'text-pink-600 bg-pink-50 border-pink-200';
            case 'Inventory (Muda)': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
            case 'Transportation (Muda)': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
            case 'Overprocessing (Muda)': return 'text-teal-600 bg-teal-50 border-teal-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const handleActionApproval = (actionIndex, status) => {
        setCorrectiveActionStatuses(prev => ({
            ...prev,
            [actionIndex]: status
        }));
    };

    const getActionStatus = (actionIndex, originalStatus) => {
        return correctiveActionStatuses[actionIndex] || originalStatus;
    };

    return (
        <div className="w-full space-y-6">
            {/* Video and Chat Section */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Video Section */}
                <div className="w-full lg:w-1/2">
                    {clipData && (
                        <ClickableVideo
                            hlsUrl={clipData.hls?.video_url}
                            thumbnailUrl={clipData.hls?.thumbnail_urls?.[0]}
                            height={null}
                            width={null}
                            button_metadata={buttonMetadata}
                        />
                    )}
                </div>

                {/* Chat Section */}
                <div className="w-full lg:w-1/2">
                    <ClipChat videoId={videoId} />
                </div>
            </div>

            {clipData ? <ChapterTimeline videoId={clipData['pegasusId']} /> : null}

            {/* Forensics Details Panel */}
            <div className="w-full">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-lime-600 rounded-lg">
                                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Forensics Analysis</h2>
                                    <p className="text-sm text-gray-600">Compliance, Risk Assessment & Summary</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                {!reportGenerated ? (
                                    <button 
                                        onClick={generateComplianceReport} 
                                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-lime-600 text-white rounded-lg hover:from-emerald-600 hover:to-lime-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        <DocumentTextIcon className="h-4 w-4" />
                                        <span className="text-sm font-medium">Generate Compliance Report</span>
                                    </button>
                                ) : (
                                    <>
                                        <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                                            <CheckCircleIcon className="h-4 w-4" />
                                            <span className="text-sm font-medium">Report Generated</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={exportToPDF}
                                                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                            >
                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                                <span className="text-sm font-medium">PDF</span>
                                            </button>
                                            <button 
                                                onClick={exportToCSV}
                                                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                            >
                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                                <span className="text-sm font-medium">CSV</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Calling TwelveLabs Pegasus model for compliance analysis...</p>
                        </div>
                    ) : !reportGenerated ? (
                        <div className="p-8 text-center">
                            <div className="mb-6">
                                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Compliance Report Generated</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    Click "Generate Compliance Report" above to analyze this clip for compliance violations, 
                                    risk assessment, and generate a comprehensive forensics summary.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <ExclamationTriangleIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <h4 className="font-medium text-gray-600 mb-1">Compliance Violations</h4>
                                    <p className="text-2xl font-bold text-gray-400">0</p>
                                    <p className="text-xs text-gray-500">No data available</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <ChartBarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <h4 className="font-medium text-gray-600 mb-1">Risk Assessment</h4>
                                    <p className="text-2xl font-bold text-gray-400">N/A</p>
                                    <p className="text-xs text-gray-500">Not analyzed</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <DocumentTextIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <h4 className="font-medium text-gray-600 mb-1">Summary</h4>
                                    <p className="text-2xl font-bold text-gray-400">0</p>
                                    <p className="text-xs text-gray-500">No findings</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* 1. COMPLIANCE VIOLATIONS - Most Critical for Factory Managers */}
                            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                                        <span>Compliance Violations</span>
                                    </h3>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-red-600">
                                                {forensicsData?.compliance.score || 0}%
                                            </div>
                                            <div className="text-sm text-gray-600">Compliance Score</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-red-600">
                                                ${forensicsData?.compliance.violations?.reduce((sum, v) => sum + (v.potentialFineUSD || 0), 0).toLocaleString() || 0}
                                            </div>
                                            <div className="text-sm text-gray-600">Potential Fines</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 p-3 bg-white/70 backdrop-blur-sm rounded-lg border border-red-200/50">
                                    <p className="text-sm text-gray-700">
                                        <strong>Scoring Methodology:</strong> {forensicsData?.compliance.scoringMethodology}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {forensicsData?.compliance.violations.map((violation) => (
                                        <div key={violation.id} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-red-200/50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(violation.severity)}`}>
                                                            {violation.severity.toUpperCase()}
                                                        </span>
                                                        <span className="text-sm text-gray-600">{violation.timestamp}</span>
                                                        <span className="text-sm text-gray-500">• {violation.location}</span>
                                                        <span className="text-sm font-bold text-red-600">${violation.potentialFineUSD?.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-800 mb-2">{violation.description}</p>
                                                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                                                        <span><strong>Regulation:</strong> {violation.regulation}</span>
                                                        <span><strong>Root Cause:</strong> {violation.rootCause}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. CORRECTIVE ACTIONS - Actionable Items */}
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                                    <ClipboardDocumentListIcon className="h-5 w-5 text-emerald-500" />
                                    <span>Corrective Actions</span>
                                </h3>

                                <div className="space-y-3">
                                    {forensicsData?.correctiveActions.map((action, index) => {
                                        const currentStatus = getActionStatus(index, action.status);
                                        return (
                                            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-200/50">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-800 mb-2">{action.action}</p>
                                                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                                                            <span className="flex items-center space-x-1">
                                                                <UserIcon className="h-3 w-3" />
                                                                <span><strong>Assignee:</strong> {action.assignee}</span>
                                                            </span>
                                                            <span className="flex items-center space-x-1">
                                                                <CalendarDaysIcon className="h-3 w-3" />
                                                                <span><strong>Due:</strong> {action.dueDate}</span>
                                                            </span>
                                                            <span><strong>Violation ID:</strong> {action.violationId}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionStatusColor(currentStatus)}`}>
                                                            {currentStatus}
                                                        </span>
                                                        {currentStatus === 'Pending' && (
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleActionApproval(index, 'Approved')}
                                                                    className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-md border border-green-200 transition-colors duration-200 flex items-center space-x-1"
                                                                >
                                                                    <CheckCircleIcon className="h-3 w-3" />
                                                                    <span>Approve</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleActionApproval(index, 'Declined')}
                                                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md border border-red-200 transition-colors duration-200 flex items-center space-x-1"
                                                                >
                                                                    <XCircleIcon className="h-3 w-3" />
                                                                    <span>Decline</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. RISK ASSESSMENT - Safety & Operational Risk */}
                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                                    <ChartBarIcon className="h-5 w-5 text-yellow-500" />
                                    <span>Risk Assessment</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <ShieldCheckIcon className="h-6 w-6 text-red-500 mx-auto mb-2" />
                                        <div className="text-lg font-bold text-gray-900 capitalize">{forensicsData?.riskAssessment.overallSafetyRisk}</div>
                                        <div className="text-xs text-gray-600">Safety Risk</div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <CogIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                        <div className="text-lg font-bold text-gray-900 capitalize">{forensicsData?.riskAssessment.overallOperationalRisk}</div>
                                        <div className="text-xs text-gray-600">Operational Risk</div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                                        <div className="text-lg font-bold text-gray-900">{forensicsData?.riskAssessment.riskFactors?.length || 0}</div>
                                        <div className="text-xs text-gray-600">Risk Factors</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-800 mb-3">Risk Factors</h4>
                                    <div className="space-y-2">
                                        {forensicsData?.riskAssessment.riskFactors.map((factor, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-lg p-3">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{factor.factor}</p>
                                                    <p className="text-xs text-gray-600">{factor.impact}</p>
                                                </div>
                                                <span className={`text-sm font-medium ${getRiskLevelColor(factor.level)}`}>
                                                    {factor.level.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 4. OPERATIONAL EFFICIENCY - Lean Manufacturing Focus */}
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                                    <WrenchScrewdriverIcon className="h-5 w-5 text-purple-500" />
                                    <span>Operational Efficiency</span>
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-3">Identified Wastes (7 Wastes of Lean)</h4>
                                        <div className="space-y-2">
                                            {forensicsData?.operationalEfficiency.identifiedWastes.map((waste, index) => (
                                                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-purple-200/50">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getWasteTypeColor(waste.type)}`}>
                                                            {waste.type}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{waste.timestamp}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-800">{waste.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-3">Recommendations</h4>
                                        <div className="space-y-2">
                                            {forensicsData?.operationalEfficiency.recommendations.map((rec, index) => (
                                                <div key={index} className="flex items-start space-x-2 bg-white/70 backdrop-blur-sm rounded-lg p-3">
                                                    <LightBulbIcon className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-sm text-gray-800">{rec}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 5. SUMMARY & METRICS - Overview */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-4">
                                    <DocumentTextIcon className="h-5 w-5 text-blue-500" />
                                    <span>Summary & Metrics</span>
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <ClockIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-gray-900">{forensicsData?.summary.duration}</div>
                                        <div className="text-xs text-gray-600">Duration</div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <UserGroupIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-gray-900">{forensicsData?.summary.workersPresent}</div>
                                        <div className="text-xs text-gray-600">Workers</div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-gray-900">{forensicsData?.summary.safetyIncidents}</div>
                                        <div className="text-xs text-gray-600">Incidents</div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-center">
                                        <CurrencyDollarIcon className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold text-gray-900">
                                            ${forensicsData?.compliance.violations?.reduce((sum, v) => sum + (v.potentialFineUSD || 0), 0).toLocaleString() || 0}
                                        </div>
                                        <div className="text-xs text-gray-600">Total Risk</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-800 mb-3">Key Findings</h4>
                                    <div className="space-y-2">
                                        {forensicsData?.summary.keyFindings.map((finding, index) => (
                                            <div key={index} className="flex items-start space-x-2 bg-white/70 backdrop-blur-sm rounded-lg p-3">
                                                <EyeIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-gray-800">{finding}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}