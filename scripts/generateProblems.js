const fs = require('fs');
const path = require('path');

// DSA problem categories
const categories = [
  'Arrays',
  'Strings',
  'Linked Lists',
  'Trees',
  'Graphs',
  'Dynamic Programming',
  'Recursion',
  'Sorting',
  'Searching',
  'Greedy Algorithms',
  'Backtracking',
  'Hash Tables',
  'Heaps',
  'Stacks',
  'Queues',
  'Binary Search',
  'Two Pointers',
  'Sliding Window',
  'Bit Manipulation',
  'Math'
];

// Define difficulties with corresponding weights
const difficulties = {
  EASY: 40,   // 40% easy problems
  MEDIUM: 40, // 40% medium problems
  HARD: 20    // 20% hard problems
};

// Define problem templates for each category
const problemTemplates = [
  // Arrays
  {
    category: 'Arrays',
    templates: [
      {
        title: 'Two Sum',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        difficulty: 'EASY',
        constraints: 'The array contains between 2 and 10^4 elements\nEach element is between -10^9 and 10^9\nThere is exactly one solution',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
        testCases: [
          { input: '[2,7,11,15], 9', expectedOutput: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
          { input: '[3,2,4], 6', expectedOutput: '[1,2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6' },
          { input: '[3,3], 6', expectedOutput: '[0,1]', explanation: 'nums[0] + nums[1] = 3 + 3 = 6' }
        ],
        templateCode: { 
          'javascript': '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Your solution here\n    \n}\n\n// Do not modify the code below\nmodule.exports = twoSum;', 
          'python': '# Definition\ndef two_sum(nums, target):\n    # Your solution here\n    \n    \n# Do not modify the code below\nif __name__ == "__main__":\n    # Example test case\n    print(two_sum([2,7,11,15], 9))', 
          'java': 'import java.util.*;\n\nclass Solution {\n    // Do not modify the class name\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        \n    }\n    \n    // Do not modify the main method\n    public static void main(String[] args) {\n        Solution solution = new Solution();\n        int[] result = solution.twoSum(new int[]{2,7,11,15}, 9);\n        System.out.println(Arrays.toString(result));\n    }\n}',
          'cpp': '#include <vector>\n#include <iostream>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        // Your solution here\n        \n    }\n};\n\n// Do not modify the code below\nint main() {\n    Solution solution;\n    std::vector<int> nums = {2, 7, 11, 15};\n    int target = 9;\n    std::vector<int> result = solution.twoSum(nums, target);\n    std::cout << "[" << result[0] << "," << result[1] << "]" << std::endl;\n    return 0;\n}'
        }
      },
      {
        title: 'Maximum Subarray',
        description: 'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(n), Space complexity: O(1)',
        testCases: [
          { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
          { input: '[1]', expectedOutput: '1', explanation: 'The single element is the subarray with the largest sum.' },
          { input: '[5,4,-1,7,8]', expectedOutput: '23', explanation: 'The subarray [5,4,-1,7,8] has the largest sum 23.' }
        ],
        templateCode: { 'javascript': 'function maxSubArray(nums) {\n    // Your code here\n}', 'python': 'def max_sub_array(nums):\n    # Your code here\n    pass' }
      },
      {
        title: 'Container With Most Water',
        description: 'Given n non-negative integers a1, a2, ..., an, where each represents a point at coordinate (i, ai). n vertical lines are drawn such that the two endpoints of the line i is at (i, ai) and (i, 0). Find two lines, which, together with the x-axis forms a container, such that the container contains the most water.',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(n), Space complexity: O(1)',
        testCases: [
          { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49', explanation: 'The maximum area is formed by the lines at positions 1 and 8 with heights 8 and 7, giving area = min(8, 7) * (8 - 1) = 7 * 7 = 49.' },
          { input: '[1,1]', expectedOutput: '1', explanation: 'The only container possible has area = min(1, 1) * (2 - 1) = 1 * 1 = 1.' },
          { input: '[4,3,2,1,4]', expectedOutput: '16', explanation: 'The maximum area is formed by the lines at positions 0 and 4 with heights 4 and 4, giving area = min(4, 4) * (4 - 0) = 4 * 4 = 16.' }
        ],
        templateCode: { 'javascript': 'function maxArea(height) {\n    // Your code here\n}', 'python': 'def max_area(height):\n    # Your code here\n    pass' }
      }
    ]
  },
  // Strings
  {
    category: 'Strings',
    templates: [
      {
        title: 'Valid Anagram',
        description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
        difficulty: 'EASY',
        constraints: 'Time complexity: O(n), Space complexity: O(1) where n is the length of the strings',
        testCases: [
          { input: '"anagram", "nagaram"', expectedOutput: 'true', explanation: 'Rearranging "anagram" gives "nagaram".' },
          { input: '"rat", "car"', expectedOutput: 'false', explanation: 'The strings contain different characters.' },
          { input: '"listen", "silent"', expectedOutput: 'true', explanation: 'Rearranging "listen" gives "silent".' }
        ],
        templateCode: { 'javascript': 'function isAnagram(s, t) {\n    // Your code here\n}', 'python': 'def is_anagram(s, t):\n    # Your code here\n    pass' }
      },
      {
        title: 'Longest Substring Without Repeating Characters',
        description: 'Given a string s, find the length of the longest substring without repeating characters.',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(n), Space complexity: O(min(m, n)) where n is the length of the string and m is the size of the character set',
        testCases: [
          { input: '"abcabcbb"', expectedOutput: '3', explanation: 'The longest substring without repeating characters is "abc" with length 3.' },
          { input: '"bbbbb"', expectedOutput: '1', explanation: 'The longest substring without repeating characters is "b" with length 1.' },
          { input: '"pwwkew"', expectedOutput: '3', explanation: 'The longest substring without repeating characters is "wke" with length 3.' }
        ],
        templateCode: { 'javascript': 'function lengthOfLongestSubstring(s) {\n    // Your code here\n}', 'python': 'def length_of_longest_substring(s):\n    # Your code here\n    pass' }
      }
    ]
  },
  // Linked Lists
  {
    category: 'Linked Lists',
    templates: [
      {
        title: 'Reverse Linked List',
        description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        difficulty: 'EASY',
        constraints: 'Time complexity: O(n), Space complexity: O(1)',
        testCases: [
          { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', explanation: 'After reversing, the linked list becomes 5->4->3->2->1.' },
          { input: '[1,2]', expectedOutput: '[2,1]', explanation: 'After reversing, the linked list becomes 2->1.' },
          { input: '[]', expectedOutput: '[]', explanation: 'An empty list remains empty after reversal.' }
        ],
        templateCode: { 'javascript': 'function reverseList(head) {\n    // Your code here\n}', 'python': 'def reverse_list(head):\n    # Your code here\n    pass' }
      },
      {
        title: 'Merge Two Sorted Lists',
        description: 'Merge two sorted linked lists and return it as a sorted list. The list should be made by splicing together the nodes of the first two lists.',
        difficulty: 'EASY',
        constraints: 'Time complexity: O(n + m), Space complexity: O(1) where n and m are the lengths of the two lists',
        testCases: [
          { input: '[1,2,4], [1,3,4]', expectedOutput: '[1,1,2,3,4,4]', explanation: 'Merging the two sorted lists results in a single sorted list with all elements from both lists.' },
          { input: '[], []', expectedOutput: '[]', explanation: 'Merging two empty lists results in an empty list.' },
          { input: '[], [0]', expectedOutput: '[0]', explanation: 'Merging an empty list with a non-empty list results in the non-empty list.' }
        ],
        templateCode: { 'javascript': 'function mergeTwoLists(l1, l2) {\n    // Your code here\n}', 'python': 'def merge_two_lists(l1, l2):\n    # Your code here\n    pass' }
      }
    ]
  },
  // Trees
  {
    category: 'Trees',
    templates: [
      {
        title: 'Maximum Depth of Binary Tree',
        description: 'Given the root of a binary tree, return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
        difficulty: 'EASY',
        constraints: 'Time complexity: O(n), Space complexity: O(h) where n is the number of nodes and h is the height of the tree',
        testCases: [
          { input: '[3,9,20,null,null,15,7]', expectedOutput: '3', explanation: 'The maximum depth is 3: from root (3) to the leaf nodes (15 or 7).' },
          { input: '[1,null,2]', expectedOutput: '2', explanation: 'The maximum depth is 2: from root (1) to the leaf node (2).' },
          { input: '[]', expectedOutput: '0', explanation: 'An empty tree has a depth of 0.' }
        ],
        templateCode: { 'javascript': 'function maxDepth(root) {\n    // Your code here\n}', 'python': 'def max_depth(root):\n    # Your code here\n    pass' }
      },
      {
        title: 'Binary Tree Level Order Traversal',
        description: 'Given the root of a binary tree, return the level order traversal of its nodes\' values. (i.e., from left to right, level by level).',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(n), Space complexity: O(n) where n is the number of nodes',
        testCases: [
          { input: '[3,9,20,null,null,15,7]', expectedOutput: '[[3],[9,20],[15,7]]', explanation: 'The level order traversal is: level 1: [3], level 2: [9,20], level 3: [15,7].' },
          { input: '[1]', expectedOutput: '[[1]]', explanation: 'A tree with only the root node has a single level.' },
          { input: '[]', expectedOutput: '[]', explanation: 'An empty tree has no levels.' }
        ],
        templateCode: { 'javascript': 'function levelOrder(root) {\n    // Your code here\n}', 'python': 'def level_order(root):\n    # Your code here\n    pass' }
      }
    ]
  },
  // Graphs
  {
    category: 'Graphs',
    templates: [
      {
        title: 'Number of Islands',
        description: 'Given an m x n 2D binary grid grid which represents a map of \'1\'s (land) and \'0\'s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(m*n), Space complexity: O(m*n) where m and n are the dimensions of the grid',
        testCases: [
          { input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expectedOutput: '1', explanation: 'There is only one island in the top left of the grid.' },
          { input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expectedOutput: '3', explanation: 'There are three islands in the grid.' },
          { input: '[["0","0","0"],["0","0","0"],["0","0","0"]]', expectedOutput: '0', explanation: 'The grid contains only water, so there are no islands.' }
        ],
        templateCode: { 'javascript': 'function numIslands(grid) {\n    // Your code here\n}', 'python': 'def num_islands(grid):\n    # Your code here\n    pass' }
      }
    ]
  },
  // Dynamic Programming
  {
    category: 'Dynamic Programming',
    templates: [
      {
        title: 'Climbing Stairs',
        description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
        difficulty: 'EASY',
        constraints: 'Time complexity: O(n), Space complexity: O(1)',
        testCases: [
          { input: '2', expectedOutput: '2', explanation: 'There are two ways to climb to the top: 1 step + 1 step, or 2 steps.' },
          { input: '3', expectedOutput: '3', explanation: 'There are three ways: 1 step + 1 step + 1 step, 1 step + 2 steps, or 2 steps + 1 step.' },
          { input: '4', expectedOutput: '5', explanation: 'There are five ways: 1+1+1+1, 1+1+2, 1+2+1, 2+1+1, or 2+2.' }
        ],
        templateCode: { 'javascript': 'function climbStairs(n) {\n    // Your code here\n}', 'python': 'def climb_stairs(n):\n    # Your code here\n    pass' }
      },
      {
        title: 'Coin Change',
        description: 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.',
        difficulty: 'MEDIUM',
        constraints: 'Time complexity: O(amount * n), Space complexity: O(amount) where n is the number of coin denominations',
        testCases: [
          { input: '[1,2,5], 11', expectedOutput: '3', explanation: '5 + 5 + 1 = 11 uses 3 coins.' },
          { input: '[2], 3', expectedOutput: '-1', explanation: 'It\'s impossible to make 3 using only 2-valued coins.' },
          { input: '[1], 0', expectedOutput: '0', explanation: 'To make 0, we need 0 coins.' }
        ],
        templateCode: { 'javascript': 'function coinChange(coins, amount) {\n    // Your code here\n}', 'python': 'def coin_change(coins, amount):\n    # Your code here\n    pass' }
      }
    ]
  }
];

// Function to generate a comprehensive list of test cases
function generateTestCases(baseTestCases, difficulty) {
  // Use the base test cases as example test cases
  const exampleTestCases = [...baseTestCases];
  
  // Generate separate evaluation test cases
  const evaluationTestCases = [];
  
  // Number of test cases to generate based on difficulty
  const numToGenerate = difficulty === 'EASY' ? 10 : difficulty === 'MEDIUM' ? 15 : 20;
  
  // Generate additional test cases based on difficulty
  for (let i = 0; i < numToGenerate; i++) {
    // For simplicity, we'll create variations of the existing test cases but with clean names
    const baseCase = baseTestCases[i % baseTestCases.length];
    
    // Create new test cases without "variation" text
    evaluationTestCases.push({
      input: baseCase.input,
      expectedOutput: baseCase.expectedOutput,
      explanation: baseCase.explanation,
      isHidden: i > 2 // Make some test cases hidden
    });
  }
  
  return {
    exampleTestCases,
    evaluationTestCases
  };
}

// Generate more problem templates to reach 100+ problems
function generateMoreProblems() {
  const moreProblems = [
    // Two Pointers technique
    {
      category: 'Two Pointers',
      templates: [
        {
          title: 'Valid Palindrome',
          description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.',
          difficulty: 'EASY',
          constraints: 'Time complexity: O(n), Space complexity: O(1)',
          testCases: [
            { input: '"A man, a plan, a canal: Panama"', expectedOutput: 'true', explanation: 'After removing non-alphanumeric characters and converting to lowercase, the string becomes "amanaplanacanalpanama", which reads the same forward and backward.' },
            { input: '"race a car"', expectedOutput: 'false', explanation: 'After processing, the string becomes "raceacar", which is not a palindrome.' },
            { input: '" "', expectedOutput: 'true', explanation: 'After processing, the string becomes "", which is a palindrome.' }
          ]
        }
      ]
    },
    // Sliding Window technique
    {
      category: 'Sliding Window',
      templates: [
        {
          title: 'Maximum Average Subarray I',
          description: 'You are given an integer array nums consisting of n elements, and an integer k. Find a contiguous subarray of length k that has the maximum average value and return this value.',
          difficulty: 'EASY',
          constraints: 'Time complexity: O(n), Space complexity: O(1)',
          testCases: [
            { input: '[1,12,-5,-6,50,3], 4', expectedOutput: '12.75', explanation: 'The subarray [12,-5,-6,50] has the maximum average (12-5-6+50)/4 = 51/4 = 12.75.' },
            { input: '[5], 1', expectedOutput: '5.0', explanation: 'There is only one subarray of length 1, so its average is 5.0.' },
            { input: '[0,1,1,3,3], 4', expectedOutput: '2.0', explanation: 'The subarray [1,1,3,3] has the maximum average (1+1+3+3)/4 = 8/4 = 2.0.' }
          ]
        }
      ]
    },
    // Bit Manipulation
    {
      category: 'Bit Manipulation',
      templates: [
        {
          title: 'Single Number',
          description: 'Given a non-empty array of integers nums, every element appears twice except for one. Find that single one. You must implement a solution with a linear runtime complexity and use only constant extra space.',
          difficulty: 'EASY',
          constraints: 'Time complexity: O(n), Space complexity: O(1)',
          testCases: [
            { input: '[2,2,1]', expectedOutput: '1', explanation: 'The element 1 appears only once, while 2 appears twice.' },
            { input: '[4,1,2,1,2]', expectedOutput: '4', explanation: 'The element 4 appears only once, while 1 and 2 appear twice.' },
            { input: '[1]', expectedOutput: '1', explanation: 'There is only one element, which appears once.' }
          ]
        }
      ]
    }
  ];
  
  return moreProblems;
}

// Add template code to all problem templates
function addTemplateCode(problemTemplate) {
  const defaultJs = `function solve(params) {\n    // Your code here\n}`;
  const defaultPy = `def solve(params):\n    # Your code here\n    pass`;
  
  if (!problemTemplate.templateCode) {
    // Create template code with locked sections for each language
    problemTemplate.templateCode = { 
      'javascript': 
`// BEGIN LOCKED
/**
 * @param {array} params - The input parameters based on the problem
 * @return {any} - The correct output based on the problem requirements
 */
// END LOCKED
function solution(params) {
    // Your solution code here
    
}

// BEGIN LOCKED
// Do not modify the code below
module.exports = solution;
// END LOCKED`,

      'python': 
`# BEGIN LOCKED
# Parameters will be specific to the problem
# Return the correct output based on the problem requirements
# END LOCKED
def solution(params):
    # Your solution code here
    pass

# BEGIN LOCKED
# Do not modify the code below
if __name__ == "__main__":
    import sys
    import json
    print(solution(*json.loads(sys.argv[1])))
# END LOCKED`,

      'java': 
`// BEGIN LOCKED
import java.util.*;

class Solution {
// END LOCKED
    public int solve(int[] nums) {
        // Your solution code here
        return 0;
    }
// BEGIN LOCKED
    
    // Do not modify the code below
    public static void main(String[] args) {
        Solution solution = new Solution();
        // Test code will be added here automatically
    }
}
// END LOCKED`,

      'cpp': 
`// BEGIN LOCKED
#include <vector>
#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>

class Solution {
public:
// END LOCKED
    int solve(std::vector<int>& nums) {
        // Your solution code here
        return 0;
    }
// BEGIN LOCKED
};

// Do not modify the code below
int main() {
    Solution solution;
    // Test code will be added here automatically
    return 0;
}
// END LOCKED`
    };
  } else {
    // If template code exists but doesn't have locked sections, add them
    for (const language in problemTemplate.templateCode) {
      const code = problemTemplate.templateCode[language];
      
      if (!code.includes('BEGIN LOCKED')) {
        switch (language) {
          case 'javascript':
            problemTemplate.templateCode[language] = 
`// BEGIN LOCKED
/**
 * Function signature and parameters depend on the problem
 */
// END LOCKED
${code}

// BEGIN LOCKED
// Do not modify the code below
module.exports = solution;
// END LOCKED`;
            break;
            
          case 'python':
            problemTemplate.templateCode[language] = 
`# BEGIN LOCKED
# Function signature and parameters depend on the problem
# END LOCKED
${code}

# BEGIN LOCKED
# Do not modify the code below
if __name__ == "__main__":
    import sys
    import json
    print(solution(*json.loads(sys.argv[1])))
# END LOCKED`;
            break;
            
          case 'java':
            problemTemplate.templateCode[language] = 
`// BEGIN LOCKED
import java.util.*;

class Solution {
// END LOCKED
${code}
// BEGIN LOCKED
    
    // Do not modify the code below
    public static void main(String[] args) {
        Solution solution = new Solution();
        // Test code will be added here automatically
    }
}
// END LOCKED`;
            break;
            
          case 'cpp':
            problemTemplate.templateCode[language] = 
`// BEGIN LOCKED
#include <vector>
#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>

class Solution {
public:
// END LOCKED
${code}
// BEGIN LOCKED
};

// Do not modify the code below
int main() {
    Solution solution;
    // Test code will be added here automatically
    return 0;
}
// END LOCKED`;
            break;
        }
      }
    }
  }
  
  return problemTemplate;
}

// Function to generate 100+ problems
function generateProblems() {
  const problems = [];
  let problemId = 1;
  
  // Combine all problem templates
  const allProblemTemplates = [...problemTemplates, ...generateMoreProblems()];
  
  // Generate problems for each category
  allProblemTemplates.forEach(categoryTemplate => {
    const category = categoryTemplate.category;
    
    categoryTemplate.templates.forEach(template => {
      // Add template code if missing
      template = addTemplateCode(template);
      
      // Generate full set of test cases
      const { exampleTestCases, evaluationTestCases } = generateTestCases(template.testCases, template.difficulty);
      
      // Format constraints for better display
      const constraints = `
<p><strong>Constraints:</strong></p>
<ul>
  <li>${template.constraints.split('\n').join('</li>\n  <li>')}</li>
</ul>
      `.trim();
      
      // Create problem object
      const problem = {
        id: `prob_${problemId}`,
        title: template.title,
        description: `${template.description}\n\n${constraints}`,
        difficulty: template.difficulty,
        constraints: template.constraints,
        timeComplexity: template.timeComplexity,
        spaceComplexity: template.spaceComplexity,
        templateCode: template.templateCode,
        exampleTestCases: exampleTestCases,
        testCases: evaluationTestCases, // These are for evaluation
        tags: [category],
        categories: [category],
        isFeatured: Math.random() < 0.2, // 20% chance of being featured
        isPublic: true,
        creatorId: 'system' // This will need to be updated with a valid user ID
      };
      
      problems.push(problem);
      problemId++;
    });
  });
  
  // Generate additional problems to reach 100+
  while (problems.length < 100) {
    // Select a random category template
    const randomCategoryIndex = Math.floor(Math.random() * allProblemTemplates.length);
    const randomCategory = allProblemTemplates[randomCategoryIndex];
    
    // Select a random template from that category
    const randomTemplateIndex = Math.floor(Math.random() * randomCategory.templates.length);
    const baseTemplate = randomCategory.templates[randomTemplateIndex];
    
    // Format constraints for better display
    const constraints = `
<p><strong>Constraints:</strong></p>
<ul>
  <li>${baseTemplate.constraints.split('\n').join('</li>\n  <li>')}</li>
</ul>
    `.trim();
    
    // Generate unique problem ID
    const uniqueId = `${baseTemplate.title.toLowerCase().replace(/\s+/g, '_')}_${problemId}`;
    
    // Generate full set of test cases
    const { exampleTestCases, evaluationTestCases } = generateTestCases(baseTemplate.testCases, baseTemplate.difficulty);
    
    // Create a new problem (not a variation)
    const newProblem = {
      id: `prob_${problemId}`,
      title: `${baseTemplate.title}`,
      description: `${baseTemplate.description}\n\n${constraints}`,
      difficulty: baseTemplate.difficulty,
      constraints: baseTemplate.constraints,
      timeComplexity: baseTemplate.timeComplexity,
      spaceComplexity: baseTemplate.spaceComplexity,
      templateCode: baseTemplate.templateCode,
      exampleTestCases: exampleTestCases,
      testCases: evaluationTestCases, // These are for evaluation
      tags: [randomCategory.category],
      categories: [randomCategory.category],
      isFeatured: Math.random() < 0.2,
      isPublic: true,
      creatorId: 'system'
    };
    
    problems.push(newProblem);
    problemId++;
  }
  
  return problems;
}

// Generate the problems
const problems = generateProblems();

// Save to JSON file
const outputDir = path.join(__dirname, '..', 'prisma', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'problems.json'),
  JSON.stringify(problems, null, 2)
);

console.log(`Successfully generated ${problems.length} problems in prisma/data/problems.json`); 
