const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const problems = [
  // ─── EASY (7) ──────────────────────────────────────────────────────────────
  {
    title: "Two Sum",
    difficulty: "EASY",
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume each input has **exactly one solution**, and you may not use the same element twice.\n\n**Example 1:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9\n```\n\n**Example 2:**\n```\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]\n```",
    constraints:
      "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nExactly one valid answer exists.",
    tags: ["Array", "Hash Table"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function twoSum(nums, target) {\n  // Your code here\n}\nmodule.exports = twoSum;",
      python: "def two_sum(nums, target):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isHidden: false },
      { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true },
    ],
  },
  {
    title: "Valid Parentheses",
    difficulty: "EASY",
    description:
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nA string is valid if:\n1. Open brackets are closed by the same type.\n2. Open brackets are closed in the correct order.\n3. Every close bracket has a corresponding open bracket.\n\n**Example 1:**\n```\nInput: s = "()"\nOutput: true\n```\n\n**Example 2:**\n```\nInput: s = "()[]{}"\nOutput: true\n```\n\n**Example 3:**\n```\nInput: s = "(]"\nOutput: false\n```',
    constraints:
      "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}' .",
    tags: ["String", "Stack"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function isValid(s) {\n  // Your code here\n}\nmodule.exports = isValid;",
      python: "def is_valid(s):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: '"()"', expectedOutput: "true", isHidden: false },
      { input: '"()[]{}"', expectedOutput: "true", isHidden: false },
      { input: '"(]"', expectedOutput: "false", isHidden: true },
      { input: '"([)]"', expectedOutput: "false", isHidden: true },
    ],
  },
  {
    title: "Merge Two Sorted Lists",
    difficulty: "EASY",
    description:
      "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one **sorted** list by splicing together the nodes of the two lists. Return the head of the merged linked list.\n\n**Example 1:**\n```\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```\n\n**Example 2:**\n```\nInput: list1 = [], list2 = [0]\nOutput: [0]\n```",
    constraints:
      "Both lists are sorted in non-decreasing order.\n0 <= Node count <= 50\n-100 <= Node.val <= 100",
    tags: ["Linked List", "Recursion"],
    timeComplexity: "O(n + m)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function mergeTwoLists(list1, list2) {\n  // Your code here\n}\nmodule.exports = mergeTwoLists;",
      python:
        "def merge_two_lists(list1, list2):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[1,2,4]\n[1,3,4]",
        expectedOutput: "[1,1,2,3,4,4]",
        isHidden: false,
      },
      { input: "[]\n[0]", expectedOutput: "[0]", isHidden: false },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    difficulty: "EASY",
    description:
      "You are given an array `prices` where `prices[i]` is the price of a stock on the *i-th* day. You want to maximize profit by choosing a **single day** to buy and a **different day in the future** to sell. Return the maximum profit, or `0` if no profit is possible.\n\n**Example 1:**\n```\nInput: prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1), sell on day 5 (price = 6) → profit = 5.\n```\n\n**Example 2:**\n```\nInput: prices = [7,6,4,3,1]\nOutput: 0\n```",
    constraints: "1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4",
    tags: ["Array", "Dynamic Programming"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function maxProfit(prices) {\n  // Your code here\n}\nmodule.exports = maxProfit;",
      python: "def max_profit(prices):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[7,1,5,3,6,4]", expectedOutput: "5", isHidden: false },
      { input: "[7,6,4,3,1]", expectedOutput: "0", isHidden: false },
      { input: "[2,4,1]", expectedOutput: "2", isHidden: true },
    ],
  },
  {
    title: "Palindrome Number",
    difficulty: "EASY",
    description:
      "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise. An integer is a palindrome when it reads the same backward as forward.\n\n**Example 1:**\n```\nInput: x = 121\nOutput: true\n```\n\n**Example 2:**\n```\nInput: x = -121\nOutput: false\n```\n\n**Example 3:**\n```\nInput: x = 10\nOutput: false\n```",
    constraints:
      "-2^31 <= x <= 2^31 - 1\nFollow up: Could you solve it without converting the integer to a string?",
    tags: ["Math"],
    timeComplexity: "O(log n)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function isPalindrome(x) {\n  // Your code here\n}\nmodule.exports = isPalindrome;",
      python: "def is_palindrome(x):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "121", expectedOutput: "true", isHidden: false },
      { input: "-121", expectedOutput: "false", isHidden: false },
      { input: "10", expectedOutput: "false", isHidden: true },
    ],
  },
  {
    title: "Maximum Subarray",
    difficulty: "EASY",
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n**Example 1:**\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n```\n\n**Example 2:**\n```\nInput: nums = [5,4,-1,7,8]\nOutput: 23\n```",
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    tags: ["Array", "Dynamic Programming", "Divide and Conquer"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function maxSubArray(nums) {\n  // Your code here\n}\nmodule.exports = maxSubArray;",
      python: "def max_sub_array(nums):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[-2,1,-3,4,-1,2,1,-5,4]",
        expectedOutput: "6",
        isHidden: false,
      },
      { input: "[1]", expectedOutput: "1", isHidden: false },
      { input: "[5,4,-1,7,8]", expectedOutput: "23", isHidden: true },
    ],
  },
  {
    title: "Contains Duplicate",
    difficulty: "EASY",
    description:
      "Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and `false` if every element is distinct.\n\n**Example 1:**\n```\nInput: nums = [1,2,3,1]\nOutput: true\n```\n\n**Example 2:**\n```\nInput: nums = [1,2,3,4]\nOutput: false\n```",
    constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9",
    tags: ["Array", "Hash Table", "Sorting"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function containsDuplicate(nums) {\n  // Your code here\n}\nmodule.exports = containsDuplicate;",
      python: "def contains_duplicate(nums):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[1,2,3,1]", expectedOutput: "true", isHidden: false },
      { input: "[1,2,3,4]", expectedOutput: "false", isHidden: false },
      {
        input: "[1,1,1,3,3,4,3,2,4,2]",
        expectedOutput: "true",
        isHidden: true,
      },
    ],
  },

  // ─── MEDIUM (8) ────────────────────────────────────────────────────────────
  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "MEDIUM",
    description:
      'Given a string `s`, find the length of the **longest substring** without repeating characters.\n\n**Example 1:**\n```\nInput: s = "abcabcbb"\nOutput: 3\nExplanation: The answer is "abc", with length 3.\n```\n\n**Example 2:**\n```\nInput: s = "bbbbb"\nOutput: 1\n```\n\n**Example 3:**\n```\nInput: s = "pwwkew"\nOutput: 3\n```',
    constraints:
      "0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.",
    tags: ["String", "Sliding Window", "Hash Table"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(min(m, n))",
    templateCode: {
      javascript:
        "function lengthOfLongestSubstring(s) {\n  // Your code here\n}\nmodule.exports = lengthOfLongestSubstring;",
      python:
        "def length_of_longest_substring(s):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: '"abcabcbb"', expectedOutput: "3", isHidden: false },
      { input: '"bbbbb"', expectedOutput: "1", isHidden: false },
      { input: '"pwwkew"', expectedOutput: "3", isHidden: true },
    ],
  },
  {
    title: "3Sum",
    difficulty: "MEDIUM",
    description:
      "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nThe solution set must not contain duplicate triplets.\n\n**Example 1:**\n```\nInput: nums = [-1,0,1,2,-1,-4]\nOutput: [[-1,-1,2],[-1,0,1]]\n```\n\n**Example 2:**\n```\nInput: nums = [0,0,0]\nOutput: [[0,0,0]]\n```",
    constraints: "3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5",
    tags: ["Array", "Two Pointers", "Sorting"],
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function threeSum(nums) {\n  // Your code here\n}\nmodule.exports = threeSum;",
      python: "def three_sum(nums):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[-1,0,1,2,-1,-4]",
        expectedOutput: "[[-1,-1,2],[-1,0,1]]",
        isHidden: false,
      },
      { input: "[0,0,0]", expectedOutput: "[[0,0,0]]", isHidden: false },
      { input: "[0,1,1]", expectedOutput: "[]", isHidden: true },
    ],
  },
  {
    title: "Group Anagrams",
    difficulty: "MEDIUM",
    description:
      'Given an array of strings `strs`, group the **anagrams** together. You can return the answer in any order.\n\n**Example 1:**\n```\nInput: strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]\n```\n\n**Example 2:**\n```\nInput: strs = [""]\nOutput: [[""]]\n```',
    constraints:
      "1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.",
    tags: ["Array", "Hash Table", "String", "Sorting"],
    timeComplexity: "O(n * k log k)",
    spaceComplexity: "O(n * k)",
    templateCode: {
      javascript:
        "function groupAnagrams(strs) {\n  // Your code here\n}\nmodule.exports = groupAnagrams;",
      python: "def group_anagrams(strs):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: '["eat","tea","tan","ate","nat","bat"]',
        expectedOutput: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        isHidden: false,
      },
      { input: '[""]', expectedOutput: '[[""]]', isHidden: false },
    ],
  },
  {
    title: "Product of Array Except Self",
    difficulty: "MEDIUM",
    description:
      "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all elements of `nums` except `nums[i]`.\n\nYou must write an algorithm that runs in O(n) time and **without using the division operation**.\n\n**Example 1:**\n```\nInput: nums = [1,2,3,4]\nOutput: [24,12,8,6]\n```\n\n**Example 2:**\n```\nInput: nums = [-1,1,0,-3,3]\nOutput: [0,0,9,0,0]\n```",
    constraints:
      "2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix/suffix of nums fits in a 32-bit integer.",
    tags: ["Array", "Prefix Sum"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function productExceptSelf(nums) {\n  // Your code here\n}\nmodule.exports = productExceptSelf;",
      python: "def product_except_self(nums):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]", isHidden: false },
      {
        input: "[-1,1,0,-3,3]",
        expectedOutput: "[0,0,9,0,0]",
        isHidden: false,
      },
    ],
  },
  {
    title: "Validate Binary Search Tree",
    difficulty: "MEDIUM",
    description:
      "Given the `root` of a binary tree, determine if it is a **valid binary search tree (BST)**.\n\nA valid BST is defined as follows:\n- The left subtree of a node contains only nodes with keys **less than** the node's key.\n- The right subtree of a node contains only nodes with keys **greater than** the node's key.\n- Both the left and right subtrees must also be binary search trees.\n\n**Example 1:**\n```\nInput: root = [2,1,3]\nOutput: true\n```\n\n**Example 2:**\n```\nInput: root = [5,1,4,null,null,3,6]\nOutput: false\nExplanation: The root node's right child is 4, which is less than 5.\n```",
    constraints:
      "The number of nodes in the tree is in the range [1, 10^4].\n-2^31 <= Node.val <= 2^31 - 1",
    tags: ["Tree", "DFS", "Binary Search Tree", "Binary Tree"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function isValidBST(root) {\n  // Your code here\n}\nmodule.exports = isValidBST;",
      python: "def is_valid_bst(root):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[2,1,3]", expectedOutput: "true", isHidden: false },
      {
        input: "[5,1,4,null,null,3,6]",
        expectedOutput: "false",
        isHidden: false,
      },
    ],
  },
  {
    title: "Coin Change",
    difficulty: "MEDIUM",
    description:
      "You are given an integer array `coins` representing different denominations and an integer `amount` representing a total amount of money.\n\nReturn the **fewest number of coins** needed to make up that amount. If that amount cannot be made up, return `-1`. You may assume infinite supply of each coin denomination.\n\n**Example 1:**\n```\nInput: coins = [1,5,10,25], amount = 30\nOutput: 2\nExplanation: 25 + 5 = 30\n```\n\n**Example 2:**\n```\nInput: coins = [2], amount = 3\nOutput: -1\n```",
    constraints:
      "1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4",
    tags: ["Dynamic Programming", "BFS"],
    timeComplexity: "O(n * amount)",
    spaceComplexity: "O(amount)",
    templateCode: {
      javascript:
        "function coinChange(coins, amount) {\n  // Your code here\n}\nmodule.exports = coinChange;",
      python: "def coin_change(coins, amount):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[1,5,10,25]\n30", expectedOutput: "2", isHidden: false },
      { input: "[2]\n3", expectedOutput: "-1", isHidden: false },
      { input: "[1]\n0", expectedOutput: "0", isHidden: true },
    ],
  },
  {
    title: "Binary Tree Level Order Traversal",
    difficulty: "MEDIUM",
    description:
      "Given the `root` of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).\n\n**Example 1:**\n```\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]\n```\n\n**Example 2:**\n```\nInput: root = [1]\nOutput: [[1]]\n```",
    constraints:
      "The number of nodes is in the range [0, 2000].\n-1000 <= Node.val <= 1000",
    tags: ["Tree", "BFS", "Binary Tree"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function levelOrder(root) {\n  // Your code here\n}\nmodule.exports = levelOrder;",
      python: "def level_order(root):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[3,9,20,null,null,15,7]",
        expectedOutput: "[[3],[9,20],[15,7]]",
        isHidden: false,
      },
      { input: "[1]", expectedOutput: "[[1]]", isHidden: false },
      { input: "[]", expectedOutput: "[]", isHidden: true },
    ],
  },
  {
    title: "Longest Palindromic Substring",
    difficulty: "MEDIUM",
    description:
      'Given a string `s`, return the **longest palindromic substring** in `s`.\n\n**Example 1:**\n```\nInput: s = "babad"\nOutput: "bab"\nExplanation: "aba" is also a valid answer.\n```\n\n**Example 2:**\n```\nInput: s = "cbbd"\nOutput: "bb"\n```',
    constraints:
      "1 <= s.length <= 1000\ns consists of only digits and English letters.",
    tags: ["String", "Dynamic Programming"],
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function longestPalindrome(s) {\n  // Your code here\n}\nmodule.exports = longestPalindrome;",
      python: "def longest_palindrome(s):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: '"babad"', expectedOutput: '"bab"', isHidden: false },
      { input: '"cbbd"', expectedOutput: '"bb"', isHidden: false },
      { input: '"a"', expectedOutput: '"a"', isHidden: true },
    ],
  },

  // ─── HARD (5) ──────────────────────────────────────────────────────────────
  {
    title: "Median of Two Sorted Arrays",
    difficulty: "HARD",
    description:
      "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the **median** of the two sorted arrays.\n\nThe overall run time complexity should be O(log(m+n)).\n\n**Example 1:**\n```\nInput: nums1 = [1,3], nums2 = [2]\nOutput: 2.0\nExplanation: merged = [1,2,3] → median is 2.0\n```\n\n**Example 2:**\n```\nInput: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.5\nExplanation: merged = [1,2,3,4] → median is (2+3)/2 = 2.5\n```",
    constraints:
      "nums1.length == m, nums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    timeComplexity: "O(log(min(m, n)))",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function findMedianSortedArrays(nums1, nums2) {\n  // Your code here\n}\nmodule.exports = findMedianSortedArrays;",
      python:
        "def find_median_sorted_arrays(nums1, nums2):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "[1,3]\n[2]", expectedOutput: "2.0", isHidden: false },
      { input: "[1,2]\n[3,4]", expectedOutput: "2.5", isHidden: false },
    ],
  },
  {
    title: "Merge K Sorted Lists",
    difficulty: "HARD",
    description:
      "You are given an array of `k` linked lists, each sorted in ascending order. Merge all the linked lists into one sorted linked list and return it.\n\n**Example 1:**\n```\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\n```\n\n**Example 2:**\n```\nInput: lists = []\nOutput: []\n```",
    constraints:
      "k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4\nTotal nodes across all lists <= 10^4",
    tags: ["Linked List", "Divide and Conquer", "Heap"],
    timeComplexity: "O(N log k)",
    spaceComplexity: "O(k)",
    templateCode: {
      javascript:
        "function mergeKLists(lists) {\n  // Your code here\n}\nmodule.exports = mergeKLists;",
      python: "def merge_k_lists(lists):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[[1,4,5],[1,3,4],[2,6]]",
        expectedOutput: "[1,1,2,3,4,4,5,6]",
        isHidden: false,
      },
      { input: "[]", expectedOutput: "[]", isHidden: false },
    ],
  },
  {
    title: "Trapping Rain Water",
    difficulty: "HARD",
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.\n\n**Example 1:**\n```\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\n```\n\n**Example 2:**\n```\nInput: height = [4,2,0,3,2,5]\nOutput: 9\n```",
    constraints:
      "n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5",
    tags: ["Array", "Two Pointers", "Stack", "Dynamic Programming"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    templateCode: {
      javascript:
        "function trap(height) {\n  // Your code here\n}\nmodule.exports = trap;",
      python: "def trap(height):\n    # Your code here\n    pass",
    },
    testCases: [
      {
        input: "[0,1,0,2,1,0,1,3,2,1,2,1]",
        expectedOutput: "6",
        isHidden: false,
      },
      { input: "[4,2,0,3,2,5]", expectedOutput: "9", isHidden: false },
    ],
  },
  {
    title: "N-Queens",
    difficulty: "HARD",
    description:
      'The **n-queens** puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.\n\nGiven an integer `n`, return *all distinct solutions* to the n-queens puzzle. Each solution is a board configuration where `"Q"` indicates a queen and `"."` indicates an empty space.\n\n**Example 1:**\n```\nInput: n = 4\nOutput: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]\n```\n\n**Example 2:**\n```\nInput: n = 1\nOutput: [["Q"]]\n```',
    constraints: "1 <= n <= 9",
    tags: ["Backtracking", "Array"],
    timeComplexity: "O(n!)",
    spaceComplexity: "O(n²)",
    templateCode: {
      javascript:
        "function solveNQueens(n) {\n  // Your code here\n}\nmodule.exports = solveNQueens;",
      python: "def solve_n_queens(n):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: "1", expectedOutput: '[["Q"]]', isHidden: false },
      {
        input: "4",
        expectedOutput:
          '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
        isHidden: false,
      },
    ],
  },
  {
    title: "Longest Valid Parentheses",
    difficulty: "HARD",
    description:
      'Given a string containing just `(` and `)`, return the length of the longest valid (well-formed) parentheses substring.\n\n**Example 1:**\n```\nInput: s = "(()"\nOutput: 2\nExplanation: The longest valid parentheses substring is "()".\n```\n\n**Example 2:**\n```\nInput: s = ")()())"\nOutput: 4\nExplanation: The longest valid parentheses substring is "()()".\n```\n\n**Example 3:**\n```\nInput: s = ""\nOutput: 0\n```',
    constraints: "0 <= s.length <= 3 * 10^4\ns[i] is '(' or ')'.",
    tags: ["String", "Dynamic Programming", "Stack"],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    templateCode: {
      javascript:
        "function longestValidParentheses(s) {\n  // Your code here\n}\nmodule.exports = longestValidParentheses;",
      python:
        "def longest_valid_parentheses(s):\n    # Your code here\n    pass",
    },
    testCases: [
      { input: '"(()"', expectedOutput: "2", isHidden: false },
      { input: '")()())"', expectedOutput: "4", isHidden: false },
      { input: '""', expectedOutput: "0", isHidden: true },
    ],
  },
];

async function main() {
  const creatorId = "cmmg0m9vw000ee8jrbfhat7ar"; // PLATFORM_ADMIN

  console.log(`Seeding ${problems.length} problems...`);

  for (const p of problems) {
    const created = await prisma.problem.create({
      data: {
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        constraints: p.constraints,
        timeComplexity: p.timeComplexity,
        spaceComplexity: p.spaceComplexity,
        templateCode: p.templateCode,
        tags: p.tags,
        isPublic: true,
        isFeatured: p.difficulty === "HARD",
        creatorId,
        testCases: p.testCases,
      },
    });

    // Also create TestCase rows for the code runner
    for (const tc of p.testCases) {
      await prisma.testCase.create({
        data: {
          problemId: created.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden ?? false,
          isExample: !tc.isHidden,
        },
      });
    }

    console.log(`  ✓ ${p.difficulty.padEnd(6)} ${p.title}`);
  }

  console.log(`\nDone! Seeded ${problems.length} problems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
