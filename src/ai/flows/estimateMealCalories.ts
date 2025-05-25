
'use server';
/**
 * @fileOverview An AI flow to estimate calories, macros, suggest a name, provide healthiness notes, and a healthiness score for a meal.
 *
 * - estimateMealCalories - A function that handles the meal calorie, macro estimation, and healthiness assessment.
 * - EstimateMealCaloriesInput - The input type for the estimateMealCalories function.
 * - EstimateMealCaloriesOutput - The return type for the estimateMealCalories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateMealCaloriesInputSchema = z.object({
  mealDescription: z.string().describe('A textual description of the meal eaten by the user. Be specific about ingredients and quantities if known.'),
  userContext: z.string().optional().describe("Optional context about the user (e.g., dietary restrictions, typical portion sizes, health goals, current weight) to help refine estimation and healthiness notes.")
});
export type EstimateMealCaloriesInput = z.infer<typeof EstimateMealCaloriesInputSchema>;

const MacrosSchema = z.object({
    protein: z.number().min(0).describe("Estimated protein in grams. Be as precise as possible based on ingredients."),
    carbs: z.number().min(0).describe("Estimated carbohydrates in grams. Be as precise as possible based on ingredients."),
    fat: z.number().min(0).describe("Estimated fat in grams. Be as precise as possible based on ingredients.")
});

const EstimateMealCaloriesOutputSchema = z.object({
  estimatedCalories: z.number().min(0).describe('The AI-estimated number of calories for the described meal. Provide a single best estimate based on common food databases and portion sizes if not specified.'),
  aiSuggestedMealName: z.string().describe('A concise, AI-generated name for the meal (e.g., "Grilled Chicken Salad", "Pasta with Tomato Sauce", "Lentil Soup"). Max 5 words.'),
  macros: MacrosSchema.describe("Estimated macronutrient breakdown of the meal (protein, carbs, fat in grams). Aim for accuracy based on typical ingredient compositions."),
  healthinessNotes: z.string().optional().describe("Brief AI comment on the meal's general healthiness or specific aspects, e.g., 'Good source of lean protein and fiber.', 'High in saturated fat and sodium, consider smaller portions or less frequent consumption.', 'Balanced meal with good complex carbohydrates.'. Keep it concise, constructive, and actionable if possible."),
  healthinessScore: z.number().min(1).max(5).optional().describe("A numerical score from 1 (very unhealthy) to 5 (very healthy), reflecting the meal's general healthiness. 1: Very Unhealthy, 2: Unhealthy, 3: Moderate, 4: Healthy, 5: Very Healthy."),
  estimationNotes: z.string().optional().describe("Any brief notes or assumptions made by the AI during calorie/macro estimation, e.g., 'Assumed medium portion size (approx. 300g).', 'Assumed grilled preparation method.', 'Calorie estimate may vary significantly based on added oils or sauces not specified.'")
});
export type EstimateMealCaloriesOutput = z.infer<typeof EstimateMealCaloriesOutputSchema>;

export async function estimateMealCalories(input: EstimateMealCaloriesInput): Promise<EstimateMealCaloriesOutput> {
  return estimateMealCaloriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateMealCaloriesPrompt',
  input: {schema: EstimateMealCaloriesInputSchema},
  output: {schema: EstimateMealCaloriesOutputSchema},
  prompt: `You are an expert nutritionist AI specializing in food logging and nutritional estimation. Your task is to analyze a user's meal description, provide accurate estimates for calories and macronutrients (protein, carbs, fat), suggest a concise name for the meal, offer brief healthiness notes, assign a healthiness score (1-5), and detail any estimation assumptions.

User's Meal Description: {{{mealDescription}}}

{{#if userContext}}
User Context for Estimation: {{{userContext}}}
{{/if}}

Instructions:
1.  **Analyze Meal Components**: Carefully break down the 'mealDescription' into its core ingredients and likely preparation methods.
2.  **Estimate Calories**: Provide your best single numerical estimate for 'estimatedCalories'. Base this on standard food composition databases. If portion size is ambiguous, assume a common medium portion (e.g., 300-400g for a mixed meal, 150-200g for a main protein) and state this in 'estimationNotes'.
3.  **Estimate Macronutrients**:
    *   'macros.protein': Estimated protein in grams.
    *   'macros.carbs': Estimated carbohydrates in grams.
    *   'macros.fat': Estimated fat in grams.
    These should be realistic, non-negative values. If a macro is likely zero (e.g., fat in plain steamed vegetables), indicate 0.
4.  **Suggest Meal Name**: For 'aiSuggestedMealName', create a short, common, and recognizable name for the meal (e.g., "Chicken Caesar Salad", "Beef Tacos with Guacamole", "Oatmeal with Berries and Nuts"). Max 5 words.
5.  **Healthiness Notes & Score**:
    *   For 'healthinessNotes', provide a brief, constructive comment. Highlight positive aspects (e.g., "Rich in fiber and vitamins.", "Good source of lean protein.") or offer gentle suggestions if applicable (e.g., "A bit high in sodium, balance with other meals.", "Consider adding more vegetables for extra nutrients."). Avoid overly judgmental language.
    *   For 'healthinessScore', assign a numerical score from 1 (very unhealthy) to 5 (very healthy) based on your overall nutritional assessment of the meal. Consider factors like processed ingredients, sugar content, saturated fats, nutrient density, and balance.
        *   1: Very Unhealthy (e.g., large fast food meal with sugary drink and fried sides)
        *   2: Unhealthy (e.g., processed snack, sugary cereal)
        *   3: Moderate (e.g., a typical sandwich, pasta with cream sauce, could be improved but not terrible)
        *   4: Healthy (e.g., grilled chicken with vegetables, lentil soup with whole grain bread)
        *   5: Very Healthy (e.g., large salad with diverse vegetables, lean protein, and healthy fats; salmon with quinoa and steamed greens)
6.  **Estimation Notes**: In 'estimationNotes', clearly state any significant assumptions made during your estimation. Examples: "Assumed medium apple (approx. 150g).", "Assumed dressing was a light vinaigrette.", "Calorie count for 'pasta' can vary widely; assumed standard wheat pasta.", "If fried, calorie and fat content would be higher." This is crucial for user understanding.

**Accuracy and Realism are Key**: Strive for the most reasonable and accurate estimations based on typical food items and preparation methods. If the description is exceptionally vague (e.g., "a sandwich"), provide a very general estimate for a common type of that food and heavily emphasize the vagueness and broad assumptions in 'estimationNotes'. Ensure the healthiness score reflects this uncertainty.

Ensure all numerical outputs (calories, macros, healthinessScore) are valid numbers.
`,
});

const estimateMealCaloriesFlow = ai.defineFlow(
  {
    name: 'estimateMealCaloriesFlow',
    inputSchema: EstimateMealCaloriesInputSchema,
    outputSchema: EstimateMealCaloriesOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback in case AI fails
      return {
        estimatedCalories: 0,
        aiSuggestedMealName: "Meal (Processing Error)",
        macros: { protein: 0, carbs: 0, fat: 0 },
        healthinessNotes: "AI could not assess meal healthiness at this time.",
        healthinessScore: undefined,
        estimationNotes: "Could not estimate calories/macros due to an AI processing error."
      };
    }
    // Ensure estimatedCalories is a number, default to 0 if AI hallucinates a string/object
    if (typeof output.estimatedCalories !== 'number' || isNaN(output.estimatedCalories)) {
        output.estimatedCalories = 0;
        output.estimationNotes = (output.estimationNotes || "") + " AI provided non-numeric calorie value, defaulted to 0.";
    }
    // Ensure macros are numbers
    output.macros = {
        protein: typeof output.macros?.protein === 'number' && !isNaN(output.macros.protein) ? output.macros.protein : 0,
        carbs: typeof output.macros?.carbs === 'number' && !isNaN(output.macros.carbs) ? output.macros.carbs : 0,
        fat: typeof output.macros?.fat === 'number' && !isNaN(output.macros.fat) ? output.macros.fat : 0,
    };
    if (output.healthinessScore && (typeof output.healthinessScore !== 'number' || isNaN(output.healthinessScore) || output.healthinessScore < 1 || output.healthinessScore > 5)) {
        output.healthinessScore = undefined; // Invalidate if not a number in range 1-5
    }
    output.healthinessNotes = output.healthinessNotes || (output.healthinessScore ? "General assessment based on score." : "No specific health notes available for this meal.");
    output.estimationNotes = output.estimationNotes || "General estimation based on description.";


    return output;
  }
);

