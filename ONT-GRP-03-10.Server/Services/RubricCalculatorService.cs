using PRS.Backend.DTOs;
using PRS.Backend.Models;

namespace PRS.Backend.Services;

public class RubricCalculatorService
{
    private const decimal Section1Weight = 0.40m;
    private const decimal Section2Weight = 0.30m;
    private const decimal Section3Weight = 0.20m;
    private const decimal Section4Weight = 0.10m;

    public RubricSectionScores CalculateSectionScores(EvaluationRubric r)
    {
        decimal s1Raw = r.ClarityScore + r.LiteratureScore + r.MethodologyScore + r.FeasibilityScore;
        decimal s1Pct = s1Raw / 20m;
        decimal s1W = s1Pct * Section1Weight * 100m;

        decimal s2Raw = r.NoveltyScore + r.ContributionScore + r.InnovationScore;
        decimal s2Pct = s2Raw / 15m;
        decimal s2W = s2Pct * Section2Weight * 100m;

        decimal s3Raw = r.WritingScore + r.LogicScore + r.CitationScore;
        decimal s3Pct = s3Raw / 15m;
        decimal s3W = s3Pct * Section3Weight * 100m;

        decimal s4Raw = r.EthicsScore + r.RiskScore;
        decimal s4Pct = s4Raw / 10m;
        decimal s4W = s4Pct * Section4Weight * 100m;

        decimal total = s1W + s2W + s3W + s4W;

        return new RubricSectionScores
        {
            Section1Raw = s1Raw,
            Section1Percentage = Math.Round(s1Pct * 100, 1),
            Section1Weighted = Math.Round(s1W, 2),
            Section2Raw = s2Raw,
            Section2Percentage = Math.Round(s2Pct * 100, 1),
            Section2Weighted = Math.Round(s2W, 2),
            Section3Raw = s3Raw,
            Section3Percentage = Math.Round(s3Pct * 100, 1),
            Section3Weighted = Math.Round(s3W, 2),
            Section4Raw = s4Raw,
            Section4Percentage = Math.Round(s4Pct * 100, 1),
            Section4Weighted = Math.Round(s4W, 2),
            TotalScore = Math.Round(total, 2)
        };
    }

    public decimal CalculateTotalScore(EvaluationRubric r)
    {
        var s = CalculateSectionScores(r);
        return Math.Round(s.TotalScore, 2);
    }

    public string GetRecommendation(decimal totalScore) => totalScore switch
    {
        >= 80 => "Accept",
        >= 70 => "Minor Revisions",
        >= 60 => "Major Revisions",
        >= 50 => "Resubmit",
        _ => "Reject"
    };
}